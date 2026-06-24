import { computeLocalAnalysis } from "./analysisFallback";
import type { AnalysisBody, Candle } from "./types";

interface LocalBacktestBody extends AnalysisBody {
  window?: number;
}

export function computeLocalBacktest(body: LocalBacktestBody) {
  const symbol = body.symbol || "UNKNOWN";
  const interval = body.interval || body.timeframe || "1D";
  const candles = normalizeCandles(body.candles);
  const windowSize = clampWindow(body.window, candles.length);

  if (candles.length < 30) {
    throw new Error("Backtest requires at least 30 candles.");
  }

  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  const decisions = [];

  for (let index = windowSize; index <= candles.length; index += 1) {
    const slice = candles.slice(Math.max(0, index - windowSize), index);
    const result = computeLocalAnalysis({ ...body, symbol, interval, candles: slice });
    const reward = Number(result.netReward.mean || 0);
    const allowed = Boolean(result.tradePermission.allowed);
    equity *= 1 + (allowed ? reward : 0);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak ? (peak - equity) / peak : 0);
    decisions.push({
      time: slice[slice.length - 1].time,
      mode: result.tradePermission.mode,
      allowed,
      netReward: reward,
      regime: result.regime
    });
  }

  return {
    schema: "msir.prism.dgwm.backtest.v1",
    adapter: "node-backtest-fallback-v1",
    symbol,
    interval,
    sampleCount: decisions.length,
    acceptedSignals: decisions.filter((item) => item.allowed).length,
    rejectedSignals: decisions.filter((item) => !item.allowed).length,
    cumulativeReturn: Number((equity - 1).toFixed(6)),
    maxDrawdown: Number(maxDrawdown.toFixed(6)),
    decisions: decisions.slice(-25),
    serviceFallback: true
  };
}

function normalizeCandles(candles: unknown): Candle[] {
  if (!Array.isArray(candles)) return [];
  return candles.filter((candle): candle is Candle => (
    candle &&
    typeof candle === "object" &&
    Number.isFinite((candle as Candle).close)
  ));
}

function clampWindow(windowValue: unknown, candleCount: number) {
  const requested = Number(windowValue || 80);
  const safe = Number.isFinite(requested) ? requested : 80;
  return Math.min(Math.max(Math.round(safe), 30), Math.max(candleCount, 30), 260);
}
