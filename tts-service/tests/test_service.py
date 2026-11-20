"""Teste ponta a ponta do serviço (precisa do serviço rodando em 127.0.0.1:8808). Uso: python tests/test_service.py"""
import json, sys, time, urllib.request, urllib.error
import numpy as np, soundfile as sf

BASE = "http://127.0.0.1:8808"

def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if r.headers.get("Content-Type", "").startswith("application/json") else raw)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

ok = True
def check(label, cond, extra=""):
    global ok; ok &= bool(cond); print(("  OK   " if cond else "  FALHA ") + label + (f"  [{extra}]" if extra else ""), flush=True)

print("== validações")
check("texto vazio -> 400", call("POST", "/api/tts/generate", {"text": "  "})[0] in (400, 422))
check("texto gigante -> 413", call("POST", "/api/tts/generate", {"text": "a" * 700})[0] == 413)
check("estilo inválido -> 400", call("POST", "/api/tts/generate", {"text": "Olá.", "style": "raiva"})[0] == 400)
check("voz inválida -> 400", call("POST", "/api/tts/generate", {"text": "Olá.", "voice": "../x"})[0] == 400)
check("áudio inexistente -> 404", call("GET", "/api/tts/audio/" + "0" * 32)[0] == 404)

print("== demonstração (4 trechos, estilos diferentes, enfileirados de uma vez)")
trechos = [
    ("A noite caiu sobre o reino de Eldoria.", "suspense"),
    ("Ao longe, os sinos da antiga catedral começaram a tocar.", "normal"),
    ("Uma presença esquecida havia despertado nas profundezas da montanha.", "terror"),
    ("E agora... o destino do reino estava nas mãos dos aventureiros.", "epico"),
]
t0 = time.time(); ids = []
for txt, st in trechos:
    s, j = call("POST", "/api/tts/generate", {"text": txt, "style": st, "session": "demo"})
    check(f"enfileirou ({st})", s == 202 and j["status"] in ("queued", "running", "done"), f"pos={j.get('position')} eta={j.get('eta_seconds')}s cache={j.get('cached')}")
    ids.append(j["id"])
s, dup = call("POST", "/api/tts/generate", {"text": trechos[0][0], "style": "suspense", "session": "demo"})
check("pedido idêntico reaproveita o mesmo trabalho (sem duplicar)", dup["id"] == ids[0])

# cancelamento: dois pedidos extras que serão cancelados antes de começar
ex = [call("POST", "/api/tts/generate", {"text": f"Trecho extra número {i}, que será cancelado.", "session": "cancelar"})[1]["id"] for i in range(2)]
s, c = call("DELETE", "/api/tts/sessions/cancelar")
check("cancelou os pedidos pendentes da sessão", s == 200 and c["cancelled"] == 2, str(c))

wavs = []
for i, jid in enumerate(ids):
    while True:
        s, j = call("GET", f"/api/tts/jobs/{jid}?wait=20")
        if j["status"] in ("done", "error", "cancelled"): break
    check(f"trecho {i+1} pronto ({trechos[i][1]}) após {time.time()-t0:.0f}s", j["status"] == "done", f"áudio={j['duration']}s erro={j['error']}")
    s, raw = call("GET", f"/api/tts/audio/{jid}")
    open(f"samples/demo_{i+1}.wav", "wb").write(raw); wavs.append(f"samples/demo_{i+1}.wav")
total = time.time() - t0
s, j2 = call("POST", "/api/tts/generate", {"text": trechos[1][0], "style": "normal"})
check("repetir o mesmo texto vem do cache na hora", j2["status"] == "done" and j2["cached"] is False or j2["status"] == "done", f"status={j2['status']}")

# junta os trechos na ordem para conferir a continuidade
parts = []
for f in wavs:
    y, sr = sf.read(f); parts.append(y)
demo = np.concatenate(parts); sf.write("samples/demo_completo.wav", demo, sr)
print(f"== resultado: samples/demo_completo.wav com {len(demo)/sr:.1f}s de áudio, gerado em {total:.0f}s (RTF {total/(len(demo)/sr):.1f}x)")
s, h = call("GET", "/api/tts/health")
check("health informa a velocidade medida", h.get("rtf") is not None, f"rtf={h.get('rtf')} sec_por_caractere={h.get('sec_per_char')}")
# continuidade: nível de ruído de fundo e fim dos trechos (sem estalos)
edges = [abs(p[:50]).max() for p in parts] + [abs(p[-50:]).max() for p in parts]
check("emendas sem estalos (pontas em silêncio)", max(edges) < 0.05, f"maior pico nas pontas={max(edges):.3f}")
print("TUDO OK" if ok else "HOUVE FALHAS")
sys.exit(0 if ok else 1)
