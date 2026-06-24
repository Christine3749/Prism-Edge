import { average, clamp, roundPrice } from "./math";
import type { AnalysisBody, Candle, SignalType, Trend } from "./types";

function pctChange(current: number, previous: number) {
  return previous ? (current - previous) / previous : 0;
}

function ema(values: number[], period: number) {
  if (values.length === 0) return 0;
  const alpha = 2 / (period + 1);
  return values.reduce((prev, value, index) => (
    index === 0 ? value : value * alpha + prev * (1 - alpha)
  ), values[0]);
}

function rsi(values: number[], period = 14) {
  if (values.length <= period) return 50;
  const deltas = values.slice(1).map((value, index) => value - values[index]);
  const window = deltas.slice(-period);
  const gains = window.filter((delta) => delta > 0);
  const losses = window.filter((delta) => delta < 0).map(Math.abs);
  const avgGain = average(gains);
  const avgLoss = average(losses);
  if (!avgLoss) return avgGain > 0 ? 100 : 50;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function atr(candles: Candle[], period = 14) {
  if (candles.length < 2) return 0;
  const ranges = candles.slice(1).map((candle, index) => {
    const prevClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - prevClose),
      Math.abs(candle.low - prevClose)
    );
  });
  return average(ranges.slice(-period));
}

function macdHist(values: number[]) {
  if (values.length < 35) return 0;
  return ema(values, 12) - ema(values, 26) - ema(values, 9) * 0.08;
}

function supportResistance(candles: Candle[]) {
  const recent = candles.slice(-80);
  const lows = recent.map((candle) => candle.low);
  const highs = recent.map((candle) => candle.high);
  const lastClose = recent[recent.length - 1].close;
  const below = lows.filter((value) => value <= lastClose).sort((a, b) => b - a);
  const above = highs.filter((value) => value >= lastClose).sort((a, b) => a - b);
  const supportSeed = below.length ? below.slice(0, 3) : [Math.min(...lows)];
  const resistanceSeed = above.length ? above.slice(0, 3) : [Math.max(...highs)];
  const support = Array.from(new Set(supportSeed.map((value) => roundPrice(value, recent))));
  const resistance = Array.from(new Set(resistanceSeed.map((value) => roundPrice(value, recent))));
  return { support: support.slice(0, 3), resistance: resistance.slice(0, 3) };
}

function getSignal(trend: Trend, rsiValue: number, volumeRatio: number): [SignalType, string] {
  if (trend === "bullish" && rsiValue < 76 && volumeRatio >= 0.75) {
    return ["buy", "Trend Continuation With Volume"];
  }
  if (trend === "bearish" && rsiValue > 24 && volumeRatio >= 0.75) {
    return ["sell", "Risk-Off Momentum Shift"];
  }
  if (rsiValue >= 76) return ["watch", "Overbought Pullback Watch"];
  if (rsiValue <= 24) return ["watch", "Oversold Rebound Watch"];
  return ["watch", "Range Structure Watch"];
}

function getRegime(score: number, metrics: Record<string, number>) {
  if (metrics.atrPct >= 0.12) return "stress";
  if (metrics.volumeRatio >= 1.45 && Math.abs(metrics.momentum) >= 0.025) return "breakout";
  if (Math.abs(score) >= 0.34) return "trend";
  if (Math.abs(score) <= 0.12) return "range";
  return "transition";
}

function getQuantState(score: number, confidence: number, metrics: Record<string, number>) {
  const volatilityLoad = clamp(metrics.atrPct * 5, 0, 0.55);
  const chopLoad = clamp(1 - Math.abs(score) * 2.2, 0, 0.45);
  const volumeLoad = clamp(Math.abs(metrics.volumeRatio - 1) * 0.12, 0, 0.18);
  const structuralError = clamp(volatilityLoad + chopLoad + volumeLoad, 0.04, 0.92);
  const spectralGap = clamp(0.18 + Math.abs(score) * 1.25 + Math.abs(metrics.emaSpread) * 7.5 - volatilityLoad * 0.45, 0.05, 0.95);
  const bellmanResidual = clamp(structuralError * 0.58 + (1 - confidence) * 0.42, 0.03, 0.95);
  const grossPnl = clamp(score * 0.032, -0.045, 0.045);
  const costPenalty = clamp(metrics.atrPct * 0.16 + Math.max(metrics.volumeRatio - 1.8, 0) * 0.002, 0.0002, 0.035);
  const riskPenalty = clamp(structuralError * 0.012 + Math.max(metrics.rsi - 78, 0) * 0.00025 + Math.max(22 - metrics.rsi, 0) * 0.00025, 0, 0.03);
  const uncertaintyPenalty = clamp(bellmanResidual * 0.01, 0.0002, 0.025);
  const mean = grossPnl - costPenalty - riskPenalty - uncertaintyPenalty;
  return {
    structuralError: Number(structuralError.toFixed(3)),
    spectralGap: Number(spectralGap.toFixed(3)),
    bellmanResidual: Number(bellmanResidual.toFixed(3)),
    netReward: {
      mean: Number(mean.toFixed(4)),
      cvar: Number((mean - clamp(metrics.atrPct * 0.22 + structuralError * 0.016, 0.002, 0.06)).toFixed(4)),
      grossPnl: Number(grossPnl.toFixed(4)),
      costPenalty: Number(costPenalty.toFixed(4)),
      riskPenalty: Number(riskPenalty.toFixed(4)),
      uncertaintyPenalty: Number(uncertaintyPenalty.toFixed(4))
    }
  };
}

function getTradePermission(trend: Trend, state: ReturnType<typeof getQuantState>, metrics: Record<string, number>) {
  const reasons: string[] = [];
  if (state.spectralGap < 0.18) reasons.push("spectral_gap_too_small");
  if (state.bellmanResidual > 0.56) reasons.push("bellman_residual_exceeded");
  if (state.structuralError > 0.74) reasons.push("structural_error_exceeded");
  if (metrics.atrPct > 0.14) reasons.push("volatility_stress");
  if (state.netReward.mean <= 0) reasons.push("no_positive_net_reward");
  const allowed = reasons.length === 0;
  const mode = !allowed
    ? (reasons.length >= 2 ? "reject" : "manual_review")
    : (state.bellmanResidual > 0.32 || state.structuralError > 0.45 ? "defensive" : "attack");
  return {
    allowed,
    mode,
    reasons,
    diagnostics: {
      structuralError: state.structuralError,
      spectralGap: state.spectralGap,
      bellmanResidual: state.bellmanResidual,
      netRewardMean: state.netReward.mean
    }
  };
}

export function computeLocalAnalysis(body: AnalysisBody) {
  const symbol = body.symbol || "UNKNOWN";
  const interval = body.interval || body.timeframe || "1D";
  const candles = Array.isArray(body.candles)
    ? body.candles.filter((candle) => Number.isFinite(candle.close))
    : [];
  if (candles.length === 0) throw new Error("Missing candles dataset.");

  const recent = candles.slice(-120);
  const last = recent[recent.length - 1];
  const closes = recent.map((candle) => candle.close);
  const volumes = recent.map((candle) => candle.volume);
  const lookbackClose = closes.length > 21 ? closes[closes.length - 21] : closes[0];
  const emaSpread = pctChange(ema(closes, 12), ema(closes, 26));
  const momentum = pctChange(last.close, lookbackClose);
  const rsiValue = rsi(closes);
  const atrPct = last.close ? atr(recent) / last.close : 0;
  const volumeBase = average(volumes.slice(-21, -1));
  const volumePower = volumeBase ? volumes[volumes.length - 1] / volumeBase : 1;
  const macdPower = last.close ? (macdHist(closes) / last.close) * 100 : 0;

  let score = 0;
  score += clamp(momentum * 12, -0.35, 0.35);
  score += clamp(emaSpread * 18, -0.25, 0.25);
  score += clamp(macdPower, -0.18, 0.18);
  score += clamp((rsiValue - 50) / 120, -0.16, 0.16);
  score += clamp((volumePower - 1) * 0.08, -0.08, 0.08);
  score -= clamp(Math.max(atrPct - 0.08, 0) * 1.2, 0, 0.12);

  const trend: Trend = score >= 0.24 ? "bullish" : score <= -0.24 ? "bearish" : "neutral";
  const [signalType, signalLabel] = getSignal(trend, rsiValue, volumePower);
  const levels = supportResistance(recent);
  const confidence = clamp(0.56 + Math.abs(score) * 0.75 + Math.min(Math.abs(volumePower - 1) * 0.05, 0.08), 0.55, 0.94);
  const metrics = {
    momentum,
    emaSpread,
    rsi: rsiValue,
    atrPct,
    volumeRatio: volumePower
  };
  const quantState = getQuantState(score, confidence, metrics);
  const tradePermission = getTradePermission(trend, quantState, metrics);
  const trendText = trend === "bullish" ? "偏多" : trend === "bearish" ? "偏空" : "中性震荡";
  const modeText = tradePermission.mode === "attack" ? "允许进攻" : tradePermission.mode === "defensive" ? "防守观察" : "暂不交易";
  const summary = `${symbol} ${interval} 当前结构${trendText}，综合量化分数 ${score.toFixed(2)}。动量 ${(momentum * 100).toFixed(2)}%，EMA 斜率 ${(emaSpread * 100).toFixed(2)}%，RSI ${rsiValue.toFixed(1)}，ATR 波动率 ${(atrPct * 100).toFixed(2)}%，量能 ${volumePower.toFixed(2)} 倍。结构误差 ${quantState.structuralError.toFixed(2)}，谱间隙 ${quantState.spectralGap.toFixed(2)}，Bellman 残差 ${quantState.bellmanResidual.toFixed(2)}，交易许可：${modeText}。上方关注 ${levels.resistance[0]}，下方关注 ${levels.support[0]}。`;

  return {
    trend,
    regime: getRegime(score, metrics),
    confidence: Number(confidence.toFixed(2)),
    ...quantState,
    tradePermission,
    diagnostics: {
      score: Number(score.toFixed(4)),
      momentum: Number(momentum.toFixed(4)),
      emaSpread: Number(emaSpread.toFixed(4)),
      rsi: Number(rsiValue.toFixed(2)),
      atrPct: Number(atrPct.toFixed(4)),
      volumeRatio: Number(volumePower.toFixed(3))
    },
    signals: [{
      type: signalType,
      time: last.time,
      price: roundPrice(last.close, recent),
      label: signalLabel,
      confidence: Number(confidence.toFixed(2))
    }],
    levels,
    summary,
    meta: {
      engine: "node-technical-fallback-v1",
      generatedAt: new Date().toISOString(),
      candleCount: candles.length
    },
    serviceFallback: true
  };
}
