import { average, clamp, roundPrice } from "./math";
import type { AnalysisBody, SignalType, Trend } from "./types";

export function computeLocalAnalysis(body: AnalysisBody) {
  const symbol = body.symbol || "UNKNOWN";
  const interval = body.interval || body.timeframe || "1D";
  const candles = Array.isArray(body.candles)
    ? body.candles.filter((candle) => Number.isFinite(candle.close))
    : [];

  if (candles.length === 0) {
    throw new Error("Missing candles dataset.");
  }

  const recent = candles.slice(-40);
  const last = recent[recent.length - 1];
  const first = recent[0];
  const closes = recent.map((candle) => candle.close);
  const highs = recent.map((candle) => candle.high);
  const lows = recent.map((candle) => candle.low);

  const smaFast = average(closes.slice(-8));
  const smaSlow = average(closes.slice(-24));
  const momentum = first.close !== 0 ? (last.close - first.close) / first.close : 0;
  const maSpread = smaSlow !== 0 ? (smaFast - smaSlow) / smaSlow : 0;

  let trend: Trend = "neutral";
  if (momentum > 0.002 && maSpread >= -0.001) trend = "bullish";
  if (momentum < -0.002 && maSpread <= 0.001) trend = "bearish";

  const confidence = clamp(0.55 + Math.abs(momentum) * 8 + Math.abs(maSpread) * 6, 0.55, 0.92);
  const signalType: SignalType = trend === "bullish" ? "buy" : trend === "bearish" ? "sell" : "watch";
  const signalLabel = trend === "bullish"
    ? "Momentum Breakout"
    : trend === "bearish"
      ? "Risk-Off Reversal"
      : "Range Compression Watch";

  const supportPrimary = Math.min(...lows.slice(-20));
  const supportSecondary = Math.min(...lows);
  const resistancePrimary = Math.max(...highs.slice(-20));
  const resistanceSecondary = Math.max(...highs);
  const support = Array.from(new Set([supportPrimary, supportSecondary].map((value) => roundPrice(value, recent))));
  const resistance = Array.from(new Set([resistancePrimary, resistanceSecondary].map((value) => roundPrice(value, recent))));

  const trendText = trend === "bullish" ? "偏多" : trend === "bearish" ? "偏空" : "中性震荡";
  const summary = `${symbol} ${interval} 当前结构${trendText}，最近窗口动量为 ${(momentum * 100).toFixed(2)}%，快慢均线差为 ${(maSpread * 100).toFixed(2)}%。短线先观察 ${resistance[0]} 压力与 ${support[0]} 支撑的有效性，等待突破或回踩确认后再提高策略权重。`;

  return {
    trend,
    confidence: Number(confidence.toFixed(2)),
    signals: [{
      type: signalType,
      time: last.time,
      price: roundPrice(last.close, recent),
      label: signalLabel,
      confidence: Number(confidence.toFixed(2))
    }],
    levels: { support, resistance },
    summary,
    meta: {
      engine: "node-offline-fallback",
      generatedAt: new Date().toISOString(),
      candleCount: candles.length
    },
    serviceFallback: true
  };
}
