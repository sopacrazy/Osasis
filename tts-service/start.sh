#!/usr/bin/env bash
# Inicia o serviço de narração em http://127.0.0.1:8808
cd "$(dirname "$0")"
[ -x .venv/bin/python ] || { echo "Rode primeiro: ./install.sh"; exit 1; }
exec ./.venv/bin/python app.py
