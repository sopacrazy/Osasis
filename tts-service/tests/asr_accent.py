import re, unicodedata
from faster_whisper import WhisperModel
REF = "O vento uivava entre as ruínas da torre, e Kaelen sentiu o coração acelerar. Algo o observava das sombras, esperando o momento certo."
NOMES = {1: "A) voz Daniel pt-BR 0.7/0.3", 2: "B) voz Daniel pt-BR 0.5/0.5", 3: "C) padrão cfg 0"}
def norm(s): s = unicodedata.normalize("NFD", s.lower()); return re.findall(r"[a-z0-9]+", "".join(c for c in s if unicodedata.category(c) != "Mn"))
def wer(r, h):
    r, h = norm(r), norm(h); d = [[0]*(len(h)+1) for _ in range(len(r)+1)]
    for i in range(len(r)+1): d[i][0] = i
    for j in range(len(h)+1): d[0][j] = j
    for i in range(1, len(r)+1):
        for j in range(1, len(h)+1): d[i][j] = min(d[i-1][j]+1, d[i][j-1]+1, d[i-1][j-1] + (r[i-1] != h[j-1]))
    return d[-1][-1] / len(r)
m = WhisperModel("small", device="cpu", compute_type="int8")
for i, nome in NOMES.items():
    segs, _ = m.transcribe(f"samples/br_{i}.wav", language="pt", beam_size=5)
    hyp = " ".join(s.text.strip() for s in segs)
    print(f"{i}) {nome:<28} erro de palavras {wer(REF, hyp)*100:3.0f}%", flush=True)
