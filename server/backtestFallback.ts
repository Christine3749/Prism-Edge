import { computeLocalAnalysis } from "./analysisFallback";
import type { AnalysisBody, Candle } from "./types";

interface LocalBacktestBody extends AnalysisBody {
  window?: number;
  horizon?: number; // bars held after a signal before the realized return is booked
  costBps?: number; // round-trip transaction cost per unit of turnover, in basis points
}

/**
 * Honest walk-forward backtest.
 *
 * The previous version compounded the model's OWN self-assessed `netReward.mean`
 * (which is derived from its score), so the equity curve went up whenever the
 * score was positive — regardless of what price actually did next. That is the
 * model marking its own homework.
 *
 * This version books the REALIZED forward return of the bars after each signal:
 *   pnl = position * (close[t + horizon] / close[t] - 1) - turnover * cost
 * and compares the result against simple buy & hold over the same span.
 */
export function computeLocalBacktest(body: LocalBacktestBody) {
  const symbol = body.symbol || "UNKNOWN";
  const interval = body.interval || body.timeframe || "1D";
  const candles = normalizeCandles(body.candles);
  const horizon = clampHorizon(body.horizon);
  const windowSize = clampWindow(body.window, candles.length - horizon - 1);
  const costBps = clampCost(body.costBps);
  const cost = costBps / 10000;

  if (candles.length < windowSize + horizon + 1) {
    throw new Error(`Backtest requires at least ${windowSize + horizon + 1} candles for window=${windowSize}, horizon=${horizon}.`);
  }

  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let prevPosition = 0;
  let activeBars = 0;
  let wins = 0;
  let trades = 0;
  let allowedCount = 0;
  let grossSum = 0;
  const decisions = [];

  const firstIndex = windowSize - 1;
  const lastIndex = candles.length - 1 - horizon;

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const slice = candles.slice(index - windowSize + 1, index + 1);
    const result = computeLocalAnalysis({ ...body, symbol, interval, candles: slice });
    const allowed = Boolean(result.tradePermission.allowed);
    if (allowed) allowedCount += 1;

    // Direction comes from the model, but only when it actually permits a trade.
    const position = !allowed
      ? 0
      : result.trend === "bullish"
        ? 1
        : result.trend === "bearish"
          ? -1
          : 0;

    // The one line that matters: what did price ACTUALLY do next?
    const entryClose = candles[index].close;
    const exitClose = candles[index + horizon].close;
    const forwardReturn = entryClose ? exitClose / entryClose - 1 : 0;

    const grossPnl = position * forwardReturn;
    const turnover = Math.abs(position - prevPosition);
    const costPaid = turnover * cost;
    const netPnl = grossPnl - costPaid;

    if (turnover > 0 && position !== 0) trades += 1;
    if (position !== 0) {
      activeBars += 1;
      grossSum += grossPnl;
      if (netPnl > 0) wins += 1;
    }

    equity *= 1 + netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak ? (peak - equity) / peak : 0);
    prevPosition = position;

    decisions.push({
      time: slice[slice.length - 1].time,
      mode: result.tradePermission.mode,
      allowed,
      position,
      forwardReturn: Number(forwardReturn.toFixed(6)),
      netReward: Number(netPnl.toFixed(6)), // now a REALIZED p&l, not a self-score
      regime: result.regime
    });
  }

  const sampleCount = decisions.length;
  const cumulativeReturn = Number((equity - 1).toFixed(6));
  const buyHoldReturn = Number((candles[lastIndex].close / candles[firstIndex].close - 1).toFixed(6));

  return {
    schema: "msir.prism.dgwm.backtest.v2-realized",
    adapter: "node-backtest-fallback-v2-realized",
    symbol,
    interval,
    window: windowSize,
    horizon,
    costBps,
    sampleCount,
    activeBars,
    trades,
    acceptedSignals: allowedCount,
    rejectedSignals: sampleCount - allowedCount,
    exposurePct: sampleCount ? Number((activeBars / sampleCount).toFixed(4)) : 0,
    winRate: activeBars ? Number((wins / activeBars).toFixed(4)) : 0,
    avgReturnPerActiveBar: activeBars ? Number((grossSum / activeBars).toFixed(6)) : 0,
    cumulativeReturn,
    buyHoldReturn,
    excessReturn: Number((cumulativeReturn - buyHoldReturn).toFixed(6)),
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

function clampHorizon(horizonValue: unknown) {
  const requested = Number(horizonValue || 1);
  const safe = Number.isFinite(requested) ? requested : 1;
  return Math.min(Math.max(Math.round(safe), 1), 20);
}

function clampCost(costValue: unknown) {
  const requested = Number(costValue);
  const safe = Number.isFinite(requested) ? requested : 5;
  return Math.min(Math.max(safe, 0), 100);
}

