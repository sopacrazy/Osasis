"""
Motor do Chatterbox (pt-br). Carrega os pesos UMA vez e gera áudio.

Montamos o modelo "à mão" porque o pacote publicado no PyPI só sabe carregar o multilíngue genérico:
  - T3 (texto -> tokens de fala):   models/t3_pt_br.safetensors   (finetune pt-BR)
  - S3Gen (tokens -> áudio):        models/s3gen_v3.safetensors
  - Codificador de voz + voz padrão: models/ve.pt, models/conds.pt (do repositório principal)
  - Tokenizador:                     models/grapheme_mtl_merged_expanded_v1.json
"""
from __future__ import annotations

import copy
import hashlib
import os
import time
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import torch
from safetensors.torch import load_file

HERE = Path(__file__).resolve().parent
MODELS_DIR = Path(os.getenv("TTS_MODELS_DIR", HERE / "models"))
VOICES_DIR = Path(os.getenv("TTS_VOICES_DIR", HERE / "voices"))


@dataclass
class Params:
    exaggeration: float = 0.5
    cfg_weight: float = 0.5
    temperature: float = 0.8
    repetition_penalty: float = 2.0
    min_p: float = 0.05
    top_p: float = 1.0


def pick_device() -> str:
    """CUDA se existir (NVIDIA); senão CPU. (Radeon antiga no Windows não tem aceleração no PyTorch.)"""
    forced = os.getenv("TTS_DEVICE")
    if forced:
        return forced
    return "cuda" if torch.cuda.is_available() else "cpu"


class Engine:
    def __init__(self) -> None:
        self.device = pick_device()
        self.model = None
        self.sr = 24000
        self.load_seconds = 0.0
        self._voices: dict[str, object] = {}
        self._default_conds = None

    # ------------------------------------------------------------------ carga
    def load(self) -> None:
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS, Conditionals
        from chatterbox.models.s3gen import S3Gen
        from chatterbox.models.t3 import T3
        from chatterbox.models.t3.modules.t3_config import T3Config
        from chatterbox.models.tokenizers import MTLTokenizer
        from chatterbox.models.voice_encoder import VoiceEncoder

        t0 = time.time()
        threads = int(os.getenv("TTS_THREADS", "0")) or (os.cpu_count() or 4)
        torch.set_num_threads(threads)
        dev = self.device
        map_loc = torch.device("cpu") if dev in ("cpu", "mps") else None

        ve = VoiceEncoder()
        ve.load_state_dict(torch.load(MODELS_DIR / "ve.pt", map_location=map_loc, weights_only=True))
        ve.to(dev).eval()

        t3 = T3(T3Config.multilingual())
        t3_state = load_file(str(MODELS_DIR / "t3_pt_br.safetensors"))
        if "model" in t3_state:
            t3_state = t3_state["model"][0]
        t3.load_state_dict(t3_state)
        t3.to(dev).eval()

        s3gen = S3Gen()
        s3_state = load_file(str(MODELS_DIR / "s3gen_v3.safetensors"))
        missing, unexpected = s3gen.load_state_dict(s3_state, strict=False)
        if missing or unexpected:
            print(f"[engine] S3Gen: faltando={len(missing)} extras={len(unexpected)}", flush=True)
        s3gen.to(dev).eval()

        tokenizer = MTLTokenizer(str(MODELS_DIR / "grapheme_mtl_merged_expanded_v1.json"))
        conds = Conditionals.load(MODELS_DIR / "conds.pt", map_location=map_loc).to(dev)

        self.model = ChatterboxMultilingualTTS(t3, s3gen, ve, tokenizer, dev, conds=conds)
        self.sr = self.model.sr
        self._default_conds = copy.deepcopy(conds)
        self._voices["padrao"] = self._default_conds
        self.load_seconds = time.time() - t0
        print(f"[engine] modelo carregado em {self.load_seconds:.1f}s (device={dev}, threads={threads})", flush=True)

    @property
    def ready(self) -> bool:
        return self.model is not None

    # ------------------------------------------------------------------ vozes
    def list_voices(self) -> list[str]:
        names = ["padrao"]
        if VOICES_DIR.exists():
            names += sorted(p.stem for p in VOICES_DIR.glob("*.wav"))
        return names

    def _conds_for(self, voice: str, exaggeration: float):
        if voice in self._voices:
            return self._voices[voice]
        wav = VOICES_DIR / f"{voice}.wav"
        if not wav.exists():
            raise KeyError(f"Voz '{voice}' não encontrada")
        assert self.model is not None
        with torch.no_grad():
            self.model.prepare_conditionals(str(wav), exaggeration=exaggeration)
        # prepare_conditionals cria um objeto novo a cada chamada: guardamos a referência (sem deepcopy)
        self._voices[voice] = self.model.conds
        return self._voices[voice]

    # ------------------------------------------------------------------ geração
    @staticmethod
    def seed_for(text: str, voice: str) -> int:
        """Mesmo texto + mesma voz = mesma semente: a voz fica consistente e o cache faz sentido."""
        return int.from_bytes(hashlib.sha256(f"{voice}|{text}".encode()).digest()[:4], "big")

    def synth(
        self,
        text: str,
        params: Params,
        voice: str = "padrao",
        cfm_steps: int | None = None,
        timings: dict | None = None,
    ) -> np.ndarray:
        """Mesma lógica do generate() do pacote, mas expondo os passos do decodificador (qualidade x velocidade)."""
        import torch.nn.functional as F
        from chatterbox.mtl_tts import punc_norm
        from chatterbox.models.s3tokenizer import drop_invalid_tokens
        from chatterbox.models.t3.modules.cond_enc import T3Cond

        m = self.model
        assert m is not None, "modelo não carregado"
        m.conds = self._conds_for(voice, params.exaggeration)
        seed = self.seed_for(text, voice)
        torch.manual_seed(seed)
        if self.device == "cuda":
            torch.cuda.manual_seed_all(seed)

        cond = m.conds.t3
        if float(params.exaggeration) != float(cond.emotion_adv[0, 0, 0].item()):
            m.conds.t3 = T3Cond(
                speaker_emb=cond.speaker_emb,
                cond_prompt_speech_tokens=cond.cond_prompt_speech_tokens,
                emotion_adv=params.exaggeration * torch.ones(1, 1, 1),
            ).to(device=self.device)

        text = punc_norm(text)
        tokens = m.tokenizer.text_to_tokens(text, language_id="pt").to(self.device)
        tokens = torch.cat([tokens, tokens], dim=0)  # duas sequências para o CFG
        tokens = F.pad(tokens, (1, 0), value=m.t3.hp.start_text_token)
        tokens = F.pad(tokens, (0, 1), value=m.t3.hp.stop_text_token)

        t0 = time.time()
        with torch.inference_mode():
            speech = m.t3.inference(
                t3_cond=m.conds.t3,
                text_tokens=tokens,
                max_new_tokens=int(os.getenv("TTS_MAX_TOKENS", "600")),
                temperature=params.temperature,
                cfg_weight=params.cfg_weight,
                repetition_penalty=params.repetition_penalty,
                min_p=params.min_p,
                top_p=params.top_p,
            )[0]
            speech = drop_invalid_tokens(speech).to(self.device)
            t1 = time.time()
            wav, _ = m.s3gen.inference(speech_tokens=speech, ref_dict=m.conds.gen, n_cfm_timesteps=cfm_steps)
            t2 = time.time()
            out = wav.squeeze(0).detach().cpu().numpy()
            out = m.watermarker.apply_watermark(out, sample_rate=self.sr)  # marca d'água obrigatória do Chatterbox
        if timings is not None:
            timings.update(t3=t1 - t0, s3gen=t2 - t1, speech_tokens=int(speech.shape[0]))
        return np.asarray(out, dtype=np.float32)
