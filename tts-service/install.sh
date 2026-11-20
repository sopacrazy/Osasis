#!/usr/bin/env bash
# Instala o serviço de narração (Chatterbox pt-BR) no Linux/macOS.
# Requisitos: Python 3.11 e ~8 GB livres em disco. Com placa NVIDIA, o PyTorch já instala a versão CUDA.
set -euo pipefail
cd "$(dirname "$0")"
PY="${PYTHON:-python3.11}"
command -v "$PY" >/dev/null || { echo "Python 3.11 não encontrado (ex.: sudo apt install python3.11 python3.11-venv)"; exit 1; }
[ -d .venv ] || "$PY" -m venv .venv
./.venv/bin/python -m pip install --upgrade pip
./.venv/bin/python -m pip install -r requirements.txt
echo "Baixando os modelos (~3,3 GB, só na primeira vez)..."
./.venv/bin/python download_models.py
echo "Pronto. Inicie com: ./start.sh"
