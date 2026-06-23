from __future__ import annotations

from datetime import datetime, timezone
from statistics import fmean
from typing import Any, Literal


Trend = Literal["bullish", "bearish", "neutral"]
SignalType = Literal["buy", "sell", "watch"]


def _clamp(value: float, lower: float, upper: float) -> float:
    return min(max(value, lower), upper)


def _safe_mean(values: list[float]) -> float:
    return fmean(values) if values else 0.0


def _round_price(value: float, candles: list[dict[str, Any]]) -> float:
    sample = next((candle.get("close") for candle in candles if candle.get("close") is not None), 0)
    decimals = 2
    if isinstance(sample, float):
        decimals = min(max(len(str(sample).split(".")[-1]), 2), 8)
    return round(value, decimals)


def _dedupe_prices(values: list[float]) -> list[float]:
    output: list[float] = []
    for value in values:
        if value not in output:
            output.append(value)
    return output


def run_analysis(
    symbol: str,
    interval: str,
    candles: list[dict[str, Any]],
    indicators: list[str] | None = None,
) -> dict[str, Any]:
    if not candles:
        raise ValueError("candles must contain at least one candle")

    normalized = [candle for candle in candles if isinstance(candle.get("close"), (int, float))]
    if not normalized:
        raise ValueError("candles must include numeric close prices")

    recent = normalized[-40:]
    first = recent[0]
    last = recent[-1]
    closes = [float(candle["close"]) for candle in recent]
    highs = [float(candle.get("high", candle["close"])) for candle in recent]
    lows = [float(candle.get("low", candle["close"])) for candle in recent]
    volumes = [float(candle.get("volume", 0)) for candle in recent]

    sma_fast = _safe_mean(closes[-8:])
    sma_slow = _safe_mean(closes[-24:])
    momentum = (float(last["close"]) - float(first["close"])) / float(first["close"]) if first["close"] else 0
    ma_spread = (sma_fast - sma_slow) / sma_slow if sma_slow else 0
    volume_ratio = volumes[-1] / _safe_mean(volumes[:-1]) if len(volumes) > 1 and _safe_mean(volumes[:-1]) else 1

    trend: Trend = "neutral"
    if momentum > 0.002 and ma_spread >= -0.001:
        trend = "bullish"
    elif momentum < -0.002 and ma_spread <= 0.001:
        trend = "bearish"

    confidence = _clamp(0.55 + abs(momentum) * 8 + abs(ma_spread) * 6 + min(abs(volume_ratio - 1) * 0.03, 0.05), 0.55, 0.94)

    signal_type: SignalType = "watch"
    signal_label = "Range Compression Watch"
    if trend == "bullish":
        signal_type = "buy"
        signal_label = "Momentum Breakout"
    elif trend == "bearish":
        signal_type = "sell"
        signal_label = "Risk-Off Reversal"

    support = _dedupe_prices([
        _round_price(min(lows[-20:]), recent),
        _round_price(min(lows), recent),
    ])
    resistance = _dedupe_prices([
        _round_price(max(highs[-20:]), recent),
        _round_price(max(highs), recent),
    ])

    trend_text = {
        "bullish": "偏多",
        "bearish": "偏空",
        "neutral": "中性震荡",
    }[trend]
    active_indicator_text = "、".join(indicators or []) or "基础价格结构"
    summary = (
        f"{symbol} {interval} 当前结构{trend_text}，最近窗口动量为 {momentum * 100:.2f}%，"
        f"快慢均线差为 {ma_spread * 100:.2f}%，量能相对均值为 {volume_ratio:.2f} 倍。"
        f"本轮模拟 adapter 已纳入 {active_indicator_text}，短线关注 {resistance[0]} 压力与 {support[0]} 支撑的确认。"
    )

    return {
        "trend": trend,
        "confidence": round(confidence, 2),
        "signals": [
            {
                "type": signal_type,
                "time": int(last.get("time", 0)),
                "price": _round_price(float(last["close"]), recent),
                "label": signal_label,
                "confidence": round(confidence, 2),
            }
        ],
        "levels": {
            "support": support,
            "resistance": resistance,
        },
        "summary": summary,
        "meta": {
            "engine": "msir-mock-quant-v0",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "candleCount": len(candles),
        },
    }
