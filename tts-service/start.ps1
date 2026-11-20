# Inicia o serviço de narração em http://127.0.0.1:8808 (carrega o modelo em ~15 s).
Set-Location $PSScriptRoot
if (-not (Test-Path ".venv\Scripts\python.exe")) { Write-Host "Rode primeiro: .\install.ps1" -ForegroundColor Red; exit 1 }
# Opcional: $env:TTS_PORT = "8808"; $env:TTS_CFM_STEPS = "4"; $env:TTS_THREADS = "6"; $env:TTS_TOKEN = "segredo"
& .\.venv\Scripts\python.exe app.py
