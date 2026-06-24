from __future__ import annotations

from typing import Any


def price_decimals(candles: list[dict[str, Any]]) -> int:
    sample = next((candle.get("close") for candle in candles if candle.get("close") is not None), 0)
    if isinstance(sample, float):
        return min(max(len(str(sample).split(".")[-1]), 2), 8)
    return 2


def round_price(value: float, candles: list[dict[str, Any]]) -> float:
    return round(value, price_decimals(candles))


def dedupe_prices(values: list[float]) -> list[float]:
    output: list[float] = []
    for value in values:
        if value not in output:
            output.append(value)
    return output


def support_resistance(candles: list[dict[str, Any]]) -> tuple[list[float], list[float]]:
    recent = candles[-80:]
    lows = [float(candle.get("low", candle["close"])) for candle in recent]
    highs = [float(candle.get("high", candle["close"])) for candle in recent]
    closes = [float(candle["close"]) for candle in recent]

    swing_lows: list[float] = []
    swing_highs: list[float] = []
    for index in range(2, len(recent) - 2):
        low = lows[index]
        high = highs[index]
        if low <= min(lows[index - 2:index] + lows[index + 1:index + 3]):
            swing_lows.append(low)
        if high >= max(highs[index - 2:index] + highs[index + 1:index + 3]):
            swing_highs.append(high)

    last_close = closes[-1] if closes else 0.0
    below = sorted([value for value in swing_lows + lows[-20:] if value <= last_close], reverse=True)
    above = sorted([value for value in swing_highs + highs[-20:] if value >= last_close])

    support = dedupe_prices([round_price(value, candles) for value in below[:3]])
    resistance = dedupe_prices([round_price(value, candles) for value in above[:3]])
    if not support:
        support = [round_price(min(lows), candles)]
    if not resistance:
        resistance = [round_price(max(highs), candles)]
    return support[:3], resistance[:3]
