# Deixa o site hospedado na VPS usar o serviço de voz DESTE computador, por um túnel SSH reverso.
# O túnel expõe a porta 8808 deste PC apenas no localhost da VPS (ninguém de fora acessa).
# Mantenha esta janela aberta enquanto estiver jogando. Exemplo:
#   .\tunnel-vps.ps1 -Server root@SEU_IP_DA_VPS
param(
  [Parameter(Mandatory = $true)][string]$Server,
  [string]$Key = "$env:USERPROFILE\.ssh\id_ed25519_rpgvps",
  [int]$Port = 8808
)
$sshArgs = @("-N", "-R", "${Port}:127.0.0.1:${Port}", "-o", "ServerAliveInterval=30", "-o", "ExitOnForwardFailure=yes")
if (Test-Path $Key) { $sshArgs += @("-i", $Key) }
Write-Host "Túnel aberto para $Server (porta $Port). Feche com Ctrl+C." -ForegroundColor Green
ssh @sshArgs $Server
