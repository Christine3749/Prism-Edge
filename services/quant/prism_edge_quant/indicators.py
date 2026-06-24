from __future__ import annotations

from statistics import fmean
from typing import Any


def clamp(value: float, lower: float, upper: float) -> float:
    return min(max(value, lower), upper)


def safe_mean(values: list[float]) -> float:
    return fmean(values) if values else 0.0


def pct_change(current: float, previous: float) -> float:
    return (current - previous) / previous if previous else 0.0


def ema_series(values: list[float], period: int) -> list[float]:
    if not values:
        return []
    alpha = 2 / (period + 1)
    output = [values[0]]
    for value in values[1:]:
        output.append((value * alpha) + (output[-1] * (1 - alpha)))
    return output


def latest_ema(values: list[float], period: int) -> float:
    series = ema_series(values, period)
    return series[-1] if series else 0.0


def rsi(values: list[float], period: int = 14) -> float:
    if len(values) <= period:
        return 50.0

    deltas = [values[index] - values[index - 1] for index in range(1, len(values))]
    window = deltas[-period:]
    gains = [delta for delta in window if delta > 0]
    losses = [-delta for delta in window if delta < 0]
    avg_gain = safe_mean(gains)
    avg_loss = safe_mean(losses)
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def macd(values: list[float]) -> tuple[float, float, float]:
    if len(values) < 35:
        return 0.0, 0.0, 0.0
    fast = ema_series(values, 12)
    slow = ema_series(values, 26)
    start = len(fast) - len(slow)
    macd_line = [fast[index + start] - slow[index] for index in range(len(slow))]
    signal = ema_series(macd_line, 9)
    if not macd_line or not signal:
        return 0.0, 0.0, 0.0
    hist = macd_line[-1] - signal[-1]
    return macd_line[-1], signal[-1], hist


def atr(candles: list[dict[str, Any]], period: int = 14) -> float:
    if len(candles) < 2:
        return 0.0

    ranges: list[float] = []
    for index in range(1, len(candles)):
        current = candles[index]
        previous = candles[index - 1]
        high = float(current.get("high", current["close"]))
        low = float(current.get("low", current["close"]))
        prev_close = float(previous["close"])
        ranges.append(max(high - low, abs(high - prev_close), abs(low - prev_close)))
    return safe_mean(ranges[-period:])


def bollinger(values: list[float], period: int = 20, multiplier: float = 2.0) -> tuple[float, float, float, float]:
    if len(values) < period:
        basis = safe_mean(values)
        return basis, basis, basis, 0.0

    window = values[-period:]
    basis = safe_mean(window)
    variance = safe_mean([(value - basis) ** 2 for value in window])
    deviation = variance ** 0.5
    upper = basis + deviation * multiplier
    lower = basis - deviation * multiplier
    width = (upper - lower) / basis if basis else 0.0
    return basis, upper, lower, width


def volume_ratio(volumes: list[float], lookback: int = 20) -> float:
    if len(volumes) < 2:
        return 1.0
    baseline = safe_mean(volumes[-lookback - 1:-1])
    return volumes[-1] / baseline if baseline else 1.0
