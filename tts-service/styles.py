"""
Estilos de narração = combinações de parâmetros do Chatterbox.

O modelo NÃO aceita instruções de emoção em texto. O que ele realmente controla são números:
  - exaggeration: intensidade/expressividade da fala
  - cfg_weight:   aderência ao texto/ritmo (menor = fala mais livre e pausada; maior = mais firme)
  - temperature:  variação entre execuções
Os valores abaixo foram escolhidos a partir de medições (ver README, seção "Estilos testados").
"""
from __future__ import annotations

from dataclasses import dataclass

from engine import Params


@dataclass(frozen=True)
class Style:
    label: str
    exaggeration: float
    cfg_weight: float
    temperature: float
    pause_after: float  # segundos de silêncio ao final do trecho (pausa dramática)

    def params(self) -> Params:
        return Params(exaggeration=self.exaggeration, cfg_weight=self.cfg_weight, temperature=self.temperature)


# Valores definidos a partir de medições (mesma frase, mesma semente; ver README, seção "Estilos testados"):
#   exaggeration ↑ = fala mais rápida, mais aguda e mais forte; ↓ = mais lenta e suave.
#   cfg_weight   ↓ = fala bem mais lenta, com pausas, mais forte e com mais variação de tom; ↑ = mais firme e rápida.
STYLES: dict[str, Style] = {
    "normal":   Style("Normal",   0.70, 0.30, 0.80, 0.20),  # escolhido de ouvido (amostra expr_3): mais expressivo que o 0,5/0,5 neutro
    "suspense": Style("Suspense", 0.40, 0.25, 0.75, 0.45),  # lento, com pausas e variação de tom
    "combate":  Style("Combate",  0.85, 0.45, 0.85, 0.12),  # rápido, agudo e forte
    "terror":   Style("Terror",   0.30, 0.25, 0.75, 0.55),  # lento, contido, pausas longas
    "tristeza": Style("Tristeza", 0.25, 0.50, 0.70, 0.40),  # lento e suave
    "epico":    Style("Épico",    0.80, 0.30, 0.80, 0.30),  # imponente: forte, pausado (dica oficial: cfg ~0,3 e exag ≥ 0,7)
    "dialogo":  Style("Diálogo",  0.65, 0.40, 0.85, 0.18),  # mais vivo que o normal
}
