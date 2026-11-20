"""Compara o sotaque/timbre gerado com a voz padrão e com referências brasileiras."""
import json, os, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
os.environ["TQDM_DISABLE"] = "1"
import librosa, numpy as np, soundfile as sf
from engine import Engine, Params, VOICES_DIR
TEXTO = "O vento uivava entre as ruínas da torre, e Kaelen sentiu o coração acelerar. Algo o observava das sombras, esperando o momento certo."
def tom(y, sr):
    f0, v, _ = librosa.pyin(y.astype("float32"), fmin=60, fmax=330, sr=sr, frame_length=2048)
    x = f0[v & ~np.isnan(f0)]; return int(np.median(x)), round(float(np.std(12 * np.log2(x / np.median(x)))), 2)
r, sr0 = sf.read(str(VOICES_DIR / "daniel_br.wav")); print(f"referência daniel_br: {len(r)/sr0:.1f}s, tom médio/variação {tom(r, sr0)}", flush=True)
e = Engine(); e.load()
GRADE = [
    ("A) voz Daniel (pt-BR) 0.7/0.3, 10 passos", "daniel_br", Params(0.7, 0.3, 0.8)),
    ("B) voz Daniel (pt-BR) 0.5/0.5, 10 passos", "daniel_br", Params(0.5, 0.5, 0.8)),
    ("C) voz padrão cfg_weight=0 (anti-sotaque)", "padrao",    Params(0.7, 0.0, 0.8)),
]
for i, (nome, voz, p) in enumerate(GRADE, 1):
    t0 = time.time(); w = e.synth(TEXTO, p, voice=voz, cfm_steps=10)
    sf.write(f"samples/br_{i}.wav", w, e.sr); hz, st = tom(w, e.sr)
    print(json.dumps(dict(config=nome, tom_medio_hz=hz, variacao_st=st, duracao=round(len(w)/e.sr, 1), gerou_em=round(time.time()-t0)), ensure_ascii=False), flush=True)
print("FIM", flush=True)
