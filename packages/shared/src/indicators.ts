import { Candle } from "./types";

export interface SeriesValue {
  time: number;
  value: number;
}

// 1. Simple Moving Average (SMA)
export function calculateSMA(candles: Candle[], period: number): SeriesValue[] {
  const result: SeriesValue[] = [];
  if (candles.length < period) return result;

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }
  return result;
}

// 2. Exponential Moving Average (EMA)
export function calculateEMA(candles: Candle[], period: number): SeriesValue[] {
  const result: SeriesValue[] = [];
  if (candles.length === 0) return result;

  const k = 2 / (period + 1);
  let ema = candles[0].close;
  result.push({ time: candles[0].time, value: ema });

  for (let i = 1; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    result.push({
      time: candles[i].time,
      value: ema,
    });
  }
  return result;
}

// 3. Bollinger Bands (BOLL)
export function calculateBollingerBands(
  candles: Candle[],
  period: number,
  multiplier: number
): { basis: SeriesValue[]; upper: SeriesValue[]; lower: SeriesValue[] } {
  const basis: SeriesValue[] = [];
  const upper: SeriesValue[] = [];
  const lower: SeriesValue[] = [];

  if (candles.length < period) return { basis, upper, lower };

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const mean = sum / period;
    basis.push({ time: candles[i].time, value: mean });

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(candles[i - j].close - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    upper.push({ time: candles[i].time, value: mean + multiplier * stdDev });
    lower.push({ time: candles[i].time, value: mean - multiplier * stdDev });
  }

  return { basis, upper, lower };
}

// 4. Relative Strength Index (RSI)
export function calculateRSI(candles: Candle[], period: number): SeriesValue[] {
  const result: SeriesValue[] = [];
  if (candles.length <= period) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  result.push({ time: candles[period].time, value: rsi });

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    result.push({ time: candles[i].time, value: rsi });
  }

  return result;
}

// 5. Moving Average Convergence Divergence (MACD)
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: SeriesValue[]; signal: SeriesValue[]; histogram: SeriesValue[] } {
  const macd: SeriesValue[] = [];
  const signal: SeriesValue[] = [];
  const histogram: SeriesValue[] = [];

  if (candles.length === 0) return { macd, signal, histogram };

  const emaFast = calculateEMA(candles, fastPeriod);
  const emaSlow = calculateEMA(candles, slowPeriod);

  const fastMap = new Map(emaFast.map((item) => [item.time, item.value]));
  const slowMap = new Map(emaSlow.map((item) => [item.time, item.value]));

  const rawMacdLine: SeriesValue[] = [];
  for (const candle of candles) {
    const fastVal = fastMap.get(candle.time);
    const slowVal = slowMap.get(candle.time);
    if (fastVal !== undefined && slowVal !== undefined) {
      rawMacdLine.push({
        time: candle.time,
        value: fastVal - slowVal,
      });
    }
  }

  const k = 2 / (signalPeriod + 1);
  if (rawMacdLine.length === 0) return { macd, signal, histogram };

  let signalEma = rawMacdLine[0].value;
  const signalMap = new Map<number, number>();
  signalMap.set(rawMacdLine[0].time, signalEma);
  signal.push({ time: rawMacdLine[0].time, value: signalEma });

  for (let i = 1; i < rawMacdLine.length; i++) {
    signalEma = rawMacdLine[i].value * k + signalEma * (1 - k);
    signal.push({ time: rawMacdLine[i].time, value: signalEma });
    signalMap.set(rawMacdLine[i].time, signalEma);
  }

  for (const item of rawMacdLine) {
    const signalVal = signalMap.get(item.time);
    macd.push(item);
    if (signalVal !== undefined) {
      histogram.push({
        time: item.time,
        value: item.value - signalVal,
      });
    }
  }

  return { macd, signal, histogram };
}

// 6. Volume Weighted Average Price (VWAP)
export function calculateVWAP(candles: Candle[]): SeriesValue[] {
  const result: SeriesValue[] = [];
  if (candles.length === 0) return result;

  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * c.volume;
    cumulativeVolume += c.volume;

    result.push({
      time: c.time,
      value: cumulativeVolume === 0 ? typicalPrice : cumulativeTypicalPriceVolume / cumulativeVolume,
    });
  }

  return result;
}
