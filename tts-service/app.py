"""
Serviço local de narração (Chatterbox pt-BR).

  POST   /api/tts/generate        enfileira a geração -> {id, status, cached, position, eta_seconds}
  GET    /api/tts/jobs/{id}       estado (aceita ?wait=SEGUNDOS para espera longa)
  GET    /api/tts/audio/{id}      áudio WAV pronto
  DELETE /api/tts/jobs/{id}       cancela um pedido pendente
  DELETE /api/tts/sessions/{sid}  cancela todos os pendentes de uma narração
  GET    /api/tts/health          modelo carregado? CPU/GPU, fila, velocidade medida
  GET    /api/tts/styles          estilos disponíveis

Modelo carregado UMA vez, em segundo plano, na inicialização. Um único trabalhador gera por vez
(CPU/GPU não ganham com paralelismo); os pedidos esperam numa fila com limite.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import queue
import re
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import soundfile as sf
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from engine import Engine
from styles import STYLES

MODEL_ID = "chatterbox-mtl-ptbr-v3"
HERE = Path(__file__).resolve().parent
CACHE_DIR = Path(os.getenv("TTS_CACHE_DIR", HERE / "cache"))
MAX_CHARS = int(os.getenv("TTS_MAX_CHARS", "600"))
QUEUE_MAX = int(os.getenv("TTS_QUEUE_MAX", "24"))
CFM_STEPS = int(os.getenv("TTS_CFM_STEPS", "10"))  # passos do decodificador (padrão do modelo): menos = mais rápido, menos nítido
CACHE_MAX_MB = int(os.getenv("TTS_CACHE_MAX_MB", "500"))
CACHE_DAYS = int(os.getenv("TTS_CACHE_DAYS", "14"))
TOKEN = os.getenv("TTS_TOKEN", "")

CACHE_DIR.mkdir(parents=True, exist_ok=True)
engine = Engine()


# ---------------------------------------------------------------------------- trabalhos
@dataclass
class Job:
    id: str
    text: str
    voice: str
    style: str
    session: str
    status: str = "queued"  # queued | running | done | error | cancelled
    error: str | None = None
    created: float = field(default_factory=time.time)
    started: float = 0.0
    finished: float = 0.0
    duration: float = 0.0  # segundos de áudio
    cached: bool = False

    @property
    def path(self) -> Path:
        return CACHE_DIR / f"{self.id}.wav"


jobs: dict[str, Job] = {}
jobs_lock = threading.Lock()
pending: "queue.Queue[Job]" = queue.Queue()
state = {"loading": True, "error": None, "sec_per_char": 0.35, "rtf": None, "done": 0}  # sec_per_char: média móvel


def job_key(text: str, voice: str, style: str) -> str:
    raw = f"{MODEL_ID}|{CFM_STEPS}|{voice}|{style}|{text}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


# ---------------------------------------------------------------------------- texto
_MD = re.compile(r"[*_`#>~]|\[\[[^\]]*\]\]")


def prepare_text(text: str) -> str:
    """Limpa o texto para a fala: sem markdown, espaços normalizados, pontuação final."""
    t = _MD.sub("", text)
    t = re.sub(r"\s+", " ", t).strip()
    t = t.replace(" - ", ", ").replace("…", "...")
    if t and t[-1] not in ".!?…\"'»”":
        t += "."
    return t


def finish_audio(wav: np.ndarray, sr: int, pause_after: float) -> np.ndarray:
    """Tira silêncio/ruído das pontas, aplica fade curto (sem estalos nas emendas) e acrescenta a pausa do estilo."""
    wav = wav.astype(np.float32)
    thr = 0.01
    idx = np.where(np.abs(wav) > thr)[0]
    if len(idx):
        wav = wav[max(0, idx[0] - int(0.03 * sr)): min(len(wav), idx[-1] + int(0.08 * sr))]
    fade = int(0.012 * sr)
    if len(wav) > 2 * fade:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        wav[:fade] *= ramp
        wav[-fade:] *= ramp[::-1]
    peak = float(np.abs(wav).max()) or 1.0
    if peak > 0.97:
        wav = wav * (0.97 / peak)
    return np.concatenate([wav, np.zeros(int(pause_after * sr), dtype=np.float32)])


# ---------------------------------------------------------------------------- trabalhador
def worker() -> None:
    while True:
        job = pending.get()
        try:
            with jobs_lock:
                if job.status == "cancelled":
                    continue
                job.status = "running"
                job.started = time.time()
            if not engine.ready:
                raise RuntimeError("modelo ainda não carregado")
            style = STYLES[job.style]
            t0 = time.time()
            wav = engine.synth(prepare_text(job.text), style.params(), voice=job.voice, cfm_steps=CFM_STEPS)
            elapsed = time.time() - t0
            wav = finish_audio(wav, engine.sr, style.pause_after)
            tmp = job.path.with_suffix(".tmp")
            sf.write(str(tmp), wav, engine.sr, format="WAV", subtype="PCM_16")
            os.replace(tmp, job.path)
            dur = len(wav) / engine.sr
            with jobs_lock:
                if job.status != "cancelled":
                    job.status = "done"
                job.duration = dur
                job.finished = time.time()
                # velocidade medida (média móvel): usada para estimar a espera
                state["sec_per_char"] = 0.7 * state["sec_per_char"] + 0.3 * (elapsed / max(len(job.text), 1))
                state["rtf"] = round(elapsed / max(dur, 0.1), 2)
                state["done"] += 1
        except Exception as exc:  # noqa: BLE001 - o serviço não pode cair por um pedido
            with jobs_lock:
                job.status = "error"
                job.error = f"{type(exc).__name__}: {exc}"[:300]
                job.finished = time.time()
            print(f"[tts] erro no trabalho {job.id}: {exc}", flush=True)


def load_model() -> None:
    try:
        engine.load()
        state["loading"] = False
    except Exception as exc:  # noqa: BLE001
        state["loading"] = False
        state["error"] = f"{type(exc).__name__}: {exc}"[:400]
        print(f"[tts] falha ao carregar o modelo: {exc}", flush=True)


def janitor() -> None:
    """Remove temporários, áudios antigos e mantém a pasta de cache dentro do limite."""
    while True:
        try:
            now = time.time()
            files = []
            for p in CACHE_DIR.glob("*"):
                if p.suffix == ".tmp" and now - p.stat().st_mtime > 600:
                    p.unlink(missing_ok=True)
                elif p.suffix == ".wav":
                    files.append((p.stat().st_mtime, p.stat().st_size, p))
            for mtime, _size, p in files:
                if now - mtime > CACHE_DAYS * 86400:
                    p.unlink(missing_ok=True)
            files = sorted((f for f in files if f[2].exists()), key=lambda f: f[0])
            total = sum(f[1] for f in files)
            while files and total > CACHE_MAX_MB * 1_000_000:
                _m, size, p = files.pop(0)
                p.unlink(missing_ok=True)
                total -= size
            with jobs_lock:  # esquece trabalhos concluídos antigos
                for jid in [j for j, jb in jobs.items() if jb.finished and now - jb.finished > 3600]:
                    jobs.pop(jid, None)
        except Exception as exc:  # noqa: BLE001
            print(f"[tts] limpeza: {exc}", flush=True)
        time.sleep(1800)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    threading.Thread(target=load_model, daemon=True, name="loader").start()
    threading.Thread(target=worker, daemon=True, name="worker").start()
    threading.Thread(target=janitor, daemon=True, name="janitor").start()
    yield


app = FastAPI(title="Zimpy Hub — Narrador (Chatterbox)", lifespan=lifespan)


def check_token(x_tts_token: str | None) -> None:
    if TOKEN and not hmac.compare_digest(x_tts_token or "", TOKEN):
        raise HTTPException(401, "Token inválido")


# ---------------------------------------------------------------------------- API
class GenerateBody(BaseModel):
    text: str = Field(..., min_length=1)
    voice: str = "padrao"
    style: str = "normal"
    session: str = Field("", max_length=64)


def position_of(job: Job) -> int:
    with pending.mutex:
        queued = [j for j in list(pending.queue) if j.status == "queued"]
    return queued.index(job) + (1 if state_running() else 0) if job in queued else 0


def state_running() -> bool:
    return any(j.status == "running" for j in list(jobs.values()))


def eta_for(job: Job) -> float:
    with pending.mutex:
        ahead = [j for j in list(pending.queue) if j.status == "queued"]
    chars = 0
    for j in ahead:
        chars += len(j.text)
        if j is job:
            break
    running = [j for j in list(jobs.values()) if j.status == "running"]
    for r in running:
        chars += max(0, len(r.text) * 0.5)  # estimativa: metade do trabalho em andamento resta
    return round(chars * state["sec_per_char"], 1)


def view(job: Job) -> dict:
    return {
        "id": job.id,
        "status": job.status,
        "cached": job.cached,
        "error": job.error,
        "duration": round(job.duration, 2),
        "position": position_of(job) if job.status == "queued" else 0,
        "eta_seconds": eta_for(job) if job.status == "queued" else 0,
    }


@app.get("/api/tts/health")
def health(x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    return {
        "ok": engine.ready,
        "ready": engine.ready,
        "loading": state["loading"],
        "error": state["error"],
        "model": MODEL_ID,
        "device": engine.device,
        "sample_rate": engine.sr,
        "queue": sum(1 for j in list(jobs.values()) if j.status in ("queued", "running")),
        "rtf": state["rtf"],  # tempo gerando / tempo de áudio (menor que 1 = mais rápido que a fala)
        "sec_per_char": round(state["sec_per_char"], 3),
        "max_chars": MAX_CHARS,
        "voices": engine.list_voices() if engine.ready else ["padrao"],
        "styles": {k: v.label for k, v in STYLES.items()},
    }


@app.get("/api/tts/styles")
def styles(x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    return {k: {"label": v.label, "exaggeration": v.exaggeration, "cfg_weight": v.cfg_weight, "pause_after": v.pause_after} for k, v in STYLES.items()}


@app.post("/api/tts/generate", status_code=202)
def generate(body: GenerateBody, x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    text = body.text.strip()
    if not text or len(text) > MAX_CHARS:
        raise HTTPException(413 if text else 400, f"Texto vazio ou maior que {MAX_CHARS} caracteres")
    if body.style not in STYLES:
        raise HTTPException(400, f"Estilo inválido. Use: {', '.join(STYLES)}")
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", body.voice):
        raise HTTPException(400, "Voz inválida")
    if engine.ready and body.voice not in engine.list_voices():
        raise HTTPException(400, f"Voz '{body.voice}' não existe")
    if state["error"]:
        raise HTTPException(503, f"Modelo indisponível: {state['error']}")

    key = job_key(text, body.voice, body.style)
    with jobs_lock:
        existing = jobs.get(key)
        if existing and existing.status in ("queued", "running", "done") and (existing.status != "done" or existing.path.exists()):
            return view(existing)  # evita geração duplicada
        job = Job(id=key, text=text, voice=body.voice, style=body.style, session=body.session)
        if job.path.exists():  # cache em disco
            job.status, job.cached, job.finished = "done", True, time.time()
            try:
                info = sf.info(str(job.path))
                job.duration = info.frames / info.samplerate
            except Exception:  # noqa: BLE001
                job.path.unlink(missing_ok=True)
                job.status, job.cached = "queued", False
        if job.status == "queued":
            if sum(1 for j in jobs.values() if j.status == "queued") >= QUEUE_MAX:
                raise HTTPException(429, "Fila de narração cheia. Tente em instantes.")
            pending.put(job)
        jobs[key] = job
    return view(job)


@app.get("/api/tts/jobs/{job_id}")
def get_job(job_id: str, wait: float = Query(0, ge=0, le=60), x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Pedido não encontrado")
    deadline = time.time() + wait
    while job.status in ("queued", "running") and time.time() < deadline:
        time.sleep(0.4)
    return view(job)


@app.get("/api/tts/audio/{job_id}")
def get_audio(job_id: str, x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    if not re.fullmatch(r"[0-9a-f]{32}", job_id):
        raise HTTPException(400, "Identificador inválido")
    path = CACHE_DIR / f"{job_id}.wav"
    if not path.exists():
        raise HTTPException(404, "Áudio ainda não está pronto")
    return FileResponse(path, media_type="audio/wav", headers={"Cache-Control": "private, max-age=86400"})


@app.delete("/api/tts/jobs/{job_id}")
def cancel_job(job_id: str, x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    with jobs_lock:
        job = jobs.get(job_id)
        if job and job.status == "queued":
            job.status = "cancelled"
    return {"ok": True}


@app.delete("/api/tts/sessions/{session}")
def cancel_session(session: str, x_tts_token: str | None = Header(default=None)):
    check_token(x_tts_token)
    n = 0
    with jobs_lock:
        for job in jobs.values():
            if job.session == session and job.status == "queued":
                job.status = "cancelled"
                n += 1
    return {"ok": True, "cancelled": n}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.getenv("TTS_HOST", "127.0.0.1"), port=int(os.getenv("TTS_PORT", "8808")), log_level="warning")
