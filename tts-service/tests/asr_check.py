"""Transcreve o áudio gerado com Whisper e compara com o texto: mede se a pronúncia é inteligível em pt-BR."""
import re, sys, unicodedata
from faster_whisper import WhisperModel
ALVO = {
 "samples/demo_1.wav": "A noite caiu sobre o reino de Eldoria.",
 "samples/demo_2.wav": "Ao longe, os sinos da antiga catedral começaram a tocar.",
 "samples/demo_3.wav": "Uma presença esquecida havia despertado nas profundezas da montanha.",
 "samples/demo_4.wav": "E agora... o destino do reino estava nas mãos dos aventureiros.",
 "samples/demo_completo.wav": "A noite caiu sobre o reino de Eldoria. Ao longe, os sinos da antiga catedral começaram a tocar. Uma presença esquecida havia despertado nas profundezas da montanha. E agora... o destino do reino estava nas mãos dos aventureiros.",
}
def norm(s): s = unicodedata.normalize("NFD", s.lower()); s = "".join(c for c in s if unicodedata.category(c) != "Mn"); return re.findall(r"[a-z0-9]+", s)
def wer(ref, hyp):
    r, h = norm(ref), norm(hyp); d = [[0]*(len(h)+1) for _ in range(len(r)+1)]
    for i in range(len(r)+1): d[i][0] = i
    for j in range(len(h)+1): d[0][j] = j
    for i in range(1, len(r)+1):
        for j in range(1, len(h)+1):
            d[i][j] = min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (r[i-1] != h[j-1]))
    return d[-1][-1] / max(len(r), 1)
m = WhisperModel("small", device="cpu", compute_type="int8")
tot = []
for f, ref in ALVO.items():
    segs, info = m.transcribe(f, language="pt", beam_size=5)
    hyp = " ".join(s.text.strip() for s in segs); w = wer(ref, hyp); tot.append(w)
    print(f"{f:<18} erro de palavras {w*100:4.0f}% | ouvido: {hyp}", flush=True)
print(f"MÉDIA dos 4 trechos: {sum(tot[:4])/4*100:.0f}% de palavras diferentes do texto original")
