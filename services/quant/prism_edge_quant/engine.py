from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from services.quant.prism_edge_quant.indicators import (
    atr,
    bollinger,
    clamp,
    latest_ema,
    macd,
    pct_change,
    rsi,
    volume_ratio,
)
from services.quant.prism_edge_quant.levels import round_price, support_resistance


Trend = Literal["bullish", "bearish", "neutral"]
SignalType = Literal["buy", "sell", "watch"]
Regime = Literal["trend", "range", "breakout", "stress", "transition"]


def _normalize(candles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for candle in candles:
        if not isinstance(candle.get("close"), (int, float)):
            continue
        close = float(candle["close"])
        normalized.append({
            "time": int(candle.get("time", 0)),
            "open": float(candle.get("open", close)),
            "high": float(candle.get("high", close)),
            "low": float(candle.get("low", close)),
            "close": close,
            "volume": float(candle.get("volume", 0)),
        })
    return normalized


def _trend_from_score(score: float) -> Trend:
    if score >= 0.24:
        return "bullish"
    if score <= -0.24:
        return "bearish"
    return "neutral"


def _signal_from_trend(trend: Trend, rsi_value: float, volume_power: float) -> tuple[SignalType, str]:
    if trend == "bullish" and rsi_value < 76 and volume_power >= 0.75:
        return "buy", "Trend Continuation With Volume"
    if trend == "bearish" and rsi_value > 24 and volume_power >= 0.75:
        return "sell", "Risk-Off Momentum Shift"
    if rsi_value >= 76:
        return "watch", "Overbought Pullback Watch"
    if rsi_value <= 24:
        return "watch", "Oversold Rebound Watch"
    return "watch", "Range Structure Watch"


def _regime_from_metrics(score: float, metrics: dict[str, float]) -> Regime:
    if metrics["atr_pct"] >= 0.12:
        return "stress"
    if metrics["volume_ratio"] >= 1.45 and abs(metrics["momentum"]) >= 0.025:
        return "breakout"
    if abs(score) >= 0.34:
        return "trend"
    if abs(score) <= 0.12:
        return "range"
    return "transition"


def _quant_state(score: float, confidence: float, metrics: dict[str, float]) -> dict[str, Any]:
    volatility_load = clamp(metrics["atr_pct"] * 5.0, 0.0, 0.55)
    chop_load = clamp(1.0 - abs(score) * 2.2, 0.0, 0.45)
    volume_load = clamp(abs(metrics["volume_ratio"] - 1.0) * 0.12, 0.0, 0.18)
    structural_error = clamp(volatility_load + chop_load + volume_load, 0.04, 0.92)
    spectral_gap = clamp(0.18 + abs(score) * 1.25 + abs(metrics["ema_spread"]) * 7.5 - volatility_load * 0.45, 0.05, 0.95)
    bellman_residual = clamp(structural_error * 0.58 + (1.0 - confidence) * 0.42, 0.03, 0.95)
    gross_pnl = clamp(score * 0.032, -0.045, 0.045)
    cost_penalty = clamp(metrics["atr_pct"] * 0.16 + max(metrics["volume_ratio"] - 1.8, 0) * 0.002, 0.0002, 0.035)
    risk_penalty = clamp(structural_error * 0.012 + max(metrics["rsi"] - 78, 0) * 0.00025 + max(22 - metrics["rsi"], 0) * 0.00025, 0.0, 0.03)
    uncertainty_penalty = clamp(bellman_residual * 0.01, 0.0002, 0.025)
    mean = gross_pnl - cost_penalty - risk_penalty - uncertainty_penalty
    cvar = mean - clamp(metrics["atr_pct"] * 0.22 + structural_error * 0.016, 0.002, 0.06)
    return {
        "structuralError": round(structural_error, 3),
        "spectralGap": round(spectral_gap, 3),
        "bellmanResidual": round(bellman_residual, 3),
        "netReward": {
            "mean": round(mean, 4),
            "cvar": round(cvar, 4),
            "grossPnl": round(gross_pnl, 4),
            "costPenalty": round(cost_penalty, 4),
            "riskPenalty": round(risk_penalty, 4),
            "uncertaintyPenalty": round(uncertainty_penalty, 4),
        },
    }


def _trade_permission(trend: Trend, state: dict[str, Any], metrics: dict[str, float]) -> dict[str, Any]:
    reasons: list[str] = []
    if state["spectralGap"] < 0.18:
        reasons.append("spectral_gap_too_small")
    if state["bellmanResidual"] > 0.56:
        reasons.append("bellman_residual_exceeded")
    if state["structuralError"] > 0.74:
        reasons.append("structural_error_exceeded")
    if metrics["atr_pct"] > 0.14:
        reasons.append("volatility_stress")
    if state["netReward"]["mean"] <= 0:
        reasons.append("no_positive_net_reward")
    allowed = not reasons
    if not allowed:
        mode = "reject" if len(reasons) >= 2 else "manual_review"
    elif state["bellmanResidual"] > 0.32 or state["structuralError"] > 0.45:
        mode = "defensive"
    else:
        mode = "attack"
    return {
        "allowed": allowed,
        "mode": mode,
        "reasons": reasons,
        "diagnostics": {
            "structuralError": state["structuralError"],
            "spectralGap": state["spectralGap"],
            "bellmanResidual": state["bellmanResidual"],
            "netRewardMean": state["netReward"]["mean"],
        },
    }


def _build_summary(
    symbol: str,
    interval: str,
    trend: Trend,
    score: float,
    metrics: dict[str, float],
    indicators: list[str] | None,
    state: dict[str, Any],
    permission: dict[str, Any],
    support: list[float],
    resistance: list[float],
) -> str:
    trend_text = {"bullish": "偏多", "bearish": "偏空", "neutral": "中性震荡"}[trend]
    active_indicator_text = "、".join(indicators or []) or "价格结构、动量、波动率"
    permission_text = "允许进攻" if permission["mode"] == "attack" else "防守观察" if permission["mode"] == "defensive" else "暂不交易"
    return (
        f"{symbol} {interval} 当前结构{trend_text}，综合量化分数 {score:+.2f}。"
        f"近端动量 {metrics['momentum'] * 100:+.2f}%，EMA 斜率 {metrics['ema_spread'] * 100:+.2f}%，"
        f"RSI {metrics['rsi']:.1f}，MACD 柱体 {metrics['macd_hist']:.4f}，"
        f"ATR 波动率 {metrics['atr_pct'] * 100:.2f}%，量能 {metrics['volume_ratio']:.2f} 倍。"
        f"结构误差 {state['structuralError']:.2f}，谱间隙 {state['spectralGap']:.2f}，"
        f"Bellman 残差 {state['bellmanResidual']:.2f}，交易许可：{permission_text}。"
        f"模型已纳入 {active_indicator_text}；上方关注 {resistance[0]}，下方关注 {support[0]}。"
    )


def run_analysis(
    symbol: str,
    interval: str,
    candles: list[dict[str, Any]],
    indicators: list[str] | None = None,
) -> dict[str, Any]:
    normalized = _normalize(candles)
    if not normalized:
        raise ValueError("candles must include numeric close prices")

    recent = normalized[-120:]
    closes = [float(candle["close"]) for candle in recent]
    volumes = [float(candle.get("volume", 0)) for candle in recent]
    last = recent[-1]
    last_close = float(last["close"])
    lookback_close = closes[-21] if len(closes) > 21 else closes[0]

    ema_fast = latest_ema(closes, 12)
    ema_slow = latest_ema(closes, 26)
    momentum = pct_change(last_close, lookback_close)
    ema_spread = pct_change(ema_fast, ema_slow)
    rsi_value = rsi(closes)
    _, _, macd_hist = macd(closes)
    atr_value = atr(recent)
    atr_pct = atr_value / last_close if last_close else 0.0
    _, _, _, boll_width = bollinger(closes)
    vol_ratio = volume_ratio(volumes)

    score = 0.0
    score += clamp(momentum * 12, -0.35, 0.35)
    score += clamp(ema_spread * 18, -0.25, 0.25)
    score += clamp(macd_hist / last_close * 100, -0.18, 0.18) if last_close else 0.0
    score += clamp((rsi_value - 50) / 120, -0.16, 0.16)
    score += clamp((vol_ratio - 1) * 0.08, -0.08, 0.08)
    score -= clamp(max(atr_pct - 0.08, 0) * 1.2, 0.0, 0.12)

    trend = _trend_from_score(score)
    signal_type, signal_label = _signal_from_trend(trend, rsi_value, vol_ratio)
    support, resistance = support_resistance(recent)
    confidence = clamp(0.56 + abs(score) * 0.75 + min(abs(vol_ratio - 1) * 0.05, 0.08), 0.55, 0.94)

    metrics = {
        "momentum": momentum,
        "ema_spread": ema_spread,
        "rsi": rsi_value,
        "macd_hist": macd_hist,
        "atr_pct": atr_pct,
        "volume_ratio": vol_ratio,
        "boll_width": boll_width,
    }
    quant_state = _quant_state(score, confidence, metrics)
    permission = _trade_permission(trend, quant_state, metrics)

    return {
        "trend": trend,
        "regime": _regime_from_metrics(score, metrics),
        "confidence": round(confidence, 2),
        **quant_state,
        "tradePermission": permission,
        "diagnostics": {
            "score": round(score, 4),
            "momentum": round(momentum, 4),
            "emaSpread": round(ema_spread, 4),
            "rsi": round(rsi_value, 2),
            "atrPct": round(atr_pct, 4),
            "volumeRatio": round(vol_ratio, 3),
        },
        "signals": [{
            "type": signal_type,
            "time": int(last.get("time", 0)),
            "price": round_price(last_close, recent),
            "label": signal_label,
            "confidence": round(confidence, 2),
        }],
        "levels": {"support": support, "resistance": resistance},
        "summary": _build_summary(symbol, interval, trend, score, metrics, indicators, quant_state, permission, support, resistance),
        "meta": {
            "engine": "prism-edge-technical-v1",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "candleCount": len(candles),
        },
    }
