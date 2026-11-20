"""Baixa os pesos do Chatterbox (pt-br) para ./models. Rode uma vez; depois funciona offline."""
import os, sys
from huggingface_hub import hf_hub_download

DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(DEST, exist_ok=True)

FILES = [
    # (repo, arquivo)
    ("ResembleAI/chatterbox", "ve.pt"),                       # codificador de voz (pequeno)
    ("ResembleAI/chatterbox", "conds.pt"),                    # voz embutida padrão
    ("ResembleAI/Chatterbox-Multilingual-pt-br", "grapheme_mtl_merged_expanded_v1.json"),
    ("ResembleAI/Chatterbox-Multilingual-pt-br", "t3_pt_br.safetensors"),   # ~2,1 GB
    ("ResembleAI/Chatterbox-Multilingual-pt-br", "s3gen_v3.safetensors"),   # ~1,1 GB
]
for repo, name in FILES:
    print(f"baixando {repo}/{name} ...", flush=True)
    p = hf_hub_download(repo_id=repo, filename=name, local_dir=DEST, token=os.getenv("HF_TOKEN"))
    print("  ok:", p, f"({os.path.getsize(p)/1e6:.0f} MB)", flush=True)
print("TUDO BAIXADO", flush=True)
