import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
"""Mede o que exaggeration e cfg_weight realmente mudam (duração/ritmo, variação de tom, energia)."""
import json, os, time
os.environ["TQDM_DISABLE"] = "1"
import librosa, numpy as np, soundfile as sf
from engine import Engine, Params
e = Engine(); e.load()
txt = "De repente, uma sombra enorme cruzou o céu, e todos ficaram em silêncio."
grid = [("base", 0.5, 0.5), ("exag baixa", 0.25, 0.5), ("exag alta", 0.9, 0.5), ("cfg baixo", 0.5, 0.15), ("cfg alto", 0.5, 0.9), ("exag alta+cfg baixo", 0.9, 0.15), ("exag baixa+cfg alto", 0.25, 0.9)]
out = []
for name, ex, cfg in grid:
    t0 = time.time(); w = e.synth(txt, Params(exaggeration=ex, cfg_weight=cfg), cfm_steps=4)
    sf.write(f"samples/style_{name.replace(' ', '_').replace('+', '_')}.wav", w, e.sr)
    y = w.astype("float32"); rms = librosa.feature.rms(y=y)[0]
    f0 = librosa.yin(y, fmin=70, fmax=400, sr=e.sr)[rms > 0.02]
    # fala efetiva (sem silêncios longos nas pontas)
    nz = np.where(rms > 0.02)[0]; speech = (nz[-1] - nz[0]) * 512 / e.sr if len(nz) else len(y) / e.sr
    r = dict(config=name, exaggeration=ex, cfg_weight=cfg, duracao=round(len(y) / e.sr, 2), fala=round(speech, 2),
             f0_medio=int(np.median(f0)), f0_desvio=round(float(np.std(f0)), 1), rms_medio=round(float(rms.mean()), 4),
             rms_pico=round(float(rms.max()), 3), gerou_em=round(time.time() - t0, 1))
    out.append(r); print(json.dumps(r, ensure_ascii=False), flush=True)
json.dump(out, open("samples/styletest.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("FIM", flush=True)
