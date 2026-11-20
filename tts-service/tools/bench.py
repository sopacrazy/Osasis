import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import time, sys, numpy as np
import soundfile as sf
from engine import Engine, Params
e = Engine(); e.load()
frases = [
 "A noite caiu sobre o reino de Eldoria.",
 "Ao longe, os sinos da antiga catedral começaram a tocar.",
]
for i, t in enumerate(frases):
    t0 = time.time(); w = e.synth(t, Params()); dt = time.time() - t0
    dur = len(w) / e.sr
    print(f"[{i}] {len(t)} chars -> áudio {dur:.1f}s em {dt:.1f}s  (RTF={dt/dur:.2f}x; <1 = mais rápido que o tempo real)", flush=True)
    sf.write(f"samples/bench_{i}.wav", w, e.sr)
