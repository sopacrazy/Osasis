# Instala o serviço de narração (Chatterbox pt-BR) no Windows.
# Requisitos: Python 3.11 (winget install Python.Python.3.11) e ~8 GB livres em disco.
param([string]$PythonVersion = "3.11")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "== Serviço de narração (Chatterbox pt-BR) ==" -ForegroundColor Cyan
try { & py "-$PythonVersion" --version | Out-Null } catch {
  Write-Host "Python $PythonVersion não encontrado. Instale com:  winget install Python.Python.3.11" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path ".venv")) { & py "-$PythonVersion" -m venv .venv }
$py = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
& $py -m pip install --upgrade pip
& $py -m pip install -r requirements.txt
Write-Host "Baixando os modelos (~3,3 GB, só na primeira vez)..." -ForegroundColor Cyan
& $py download_models.py
Write-Host "`nPronto. Inicie com:  .\start.ps1" -ForegroundColor Green
