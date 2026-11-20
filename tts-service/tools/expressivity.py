"""Mede a expressividade do áudio (variação de tom, amplitude de tom, dinâmica de energia) em várias configurações."""
import json, os, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
os.environ["TQDM_DISABLE"] = "1"
import librosa, numpy as np, soundfile as sf
from engine import Engine, Params, VOICES_DIR

TEXTO = "O vento uivava entre as ruínas da torre, e Kaelen sentiu o coração acelerar. Algo o observava das sombras, esperando o momento certo."
REF_TEXTO = "Escutem, viajantes! Há muito tempo, antes dos reinos, uma sombra cobriu o mundo... e só os corajosos ousaram enfrentá-la. Será que você é um deles?"

def metricas(y, sr):
    y = y.astype("float32")
    f0, voiced, _ = librosa.pyin(y, fmin=70, fmax=330, sr=sr, frame_length=2048)
    v = f0[voiced & ~np.isnan(f0)]
    st = 12 * np.log2(v / np.median(v))
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    db = 20 * np.log10(rms + 1e-6); ativo = db[db > db.max() - 40]
    nz = np.where(rms > 0.02)[0]; fala = (nz[-1] - nz[0]) * 512 / sr
    return dict(tom_desvio_st=round(float(np.std(st)), 2), tom_amplitude_st=round(float(np.percentile(st, 90) - np.percentile(st, 10)), 1),
                energia_desvio_db=round(float(np.std(ativo)), 1), fala_s=round(float(fala), 1), tom_medio_hz=int(np.median(v)))

e = Engine(); e.load()
VOICES_DIR.mkdir(exist_ok=True)
ref = VOICES_DIR / "narrador.wav"
if not ref.exists():  # referência dramática gerada pelo próprio modelo (sem voz de terceiros)
    w = e.synth(REF_TEXTO, Params(exaggeration=0.9, cfg_weight=0.25, temperature=0.9), cfm_steps=10)
    sf.write(str(ref), w, e.sr); print("referência dramática criada:", len(w) / e.sr, "s", flush=True)

GRADE = [
    ("atual (0.5/0.5, 4 passos)",       Params(0.5, 0.5, 0.8), 4,  "padrao"),
    ("0.5/0.5, 10 passos",              Params(0.5, 0.5, 0.8), 10, "padrao"),
    ("0.7/0.3, 10 passos",              Params(0.7, 0.3, 0.8), 10, "padrao"),
    ("0.8/0.3 temp1.0, 10 passos",      Params(0.8, 0.3, 1.0), 10, "padrao"),
    ("ref. dramática 0.5/0.5, 10",      Params(0.5, 0.5, 0.8), 10, "narrador"),
    ("ref. dramática 0.7/0.3, 10",      Params(0.7, 0.3, 0.85), 10, "narrador"),
]
out = []
ONLY = {int(x) for x in os.getenv("EXPR_ONLY", "").split(",") if x.strip()}
for idx, (nome, p, steps, voz) in enumerate(GRADE, 1):
    if ONLY and idx not in ONLY:
        continue
    t0 = time.time(); w = e.synth(TEXTO, p, voice=voz, cfm_steps=steps); dt = time.time() - t0
    arq = f"samples/expr_{idx}.wav"; sf.write(arq, w, e.sr)
    m = metricas(w, e.sr); m.update(config=nome, arquivo=arq, gerou_em=round(dt)); out.append(m)
    print(json.dumps(m, ensure_ascii=False), flush=True)
json.dump(out, open(f"samples/expressivity_{os.getenv('EXPR_ONLY','all')}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("FIM", flush=True)
