# Gera uma voz de referência pt-BR masculina a partir da voz do Windows (Microsoft Daniel) -> voices\daniel_br.wav
# Uso local (a gravação fica só neste PC; voices\*.wav não vai para o Git).
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
$voz = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.Language -eq 'pt-BR' -and $_.Gender -eq 'Male' } | Select-Object -First 1
if (-not $voz) { throw "Nenhuma voz masculina pt-BR instalada (Configurações > Hora e idioma > Fala)." }
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer; $synth.Voice = $voz
$texto = "Meu nome é Daniel, e hoje eu vou contar uma história de aventura. Era uma vez, num reino muito distante, um grande dia de festa. De repente, todos ficaram em silêncio, porque a noite chegou de uma vez só."
$ext = [System.WindowsRuntimeSystemExtensions]
$asTask = ($ext.GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$task = $asTask.MakeGenericMethod([Windows.Media.SpeechSynthesis.SpeechSynthesisStream]).Invoke($null, @($synth.SynthesizeTextToStreamAsync($texto)))
$task.Wait()
$net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($task.Result)
$saida = Join-Path (Split-Path $PSScriptRoot -Parent) "voices\daniel_br.wav"
New-Item -ItemType Directory -Force (Split-Path $saida) | Out-Null
$fs = [System.IO.File]::Create($saida); $net.CopyTo($fs); $fs.Close()
"Gerado: $saida ($($voz.DisplayName))"
