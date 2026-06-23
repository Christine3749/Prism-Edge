import type { BinanceKline, Candle } from "./types";

export function toStrictNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function removeOutlierCandles(candles: Candle[]) {
  if (candles.length < 10) return candles;

  const closes = candles
    .map((candle) => candle.close)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (closes.length === 0) return candles;
  const median = closes[Math.floor(closes.length / 2)];
  if (!Number.isFinite(median) || median <= 0) return candles;

  return candles.filter((candle) => {
    const minPrice = Math.min(candle.open, candle.high, candle.low, candle.close);
    const maxPrice = Math.max(candle.open, candle.high, candle.low, candle.close);
    return minPrice > median * 0.2 && maxPrice < median * 5;
  });
}

export function parseYahooCandles(result: any, limit: number): Candle[] {
  const timestamps = Array.isArray(result?.timestamp) ? result.timestamp : [];
  const quote = result?.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const candles = timestamps.flatMap((time: unknown, index: number) => {
    const candleTime = toStrictNumber(time);
    const open = toStrictNumber(opens[index]);
    const high = toStrictNumber(highs[index]);
    const low = toStrictNumber(lows[index]);
    const close = toStrictNumber(closes[index]);
    const volume = toStrictNumber(volumes[index]) || 0;

    if (
      candleTime === null ||
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      open <= 0 ||
      high <= 0 ||
      low <= 0 ||
      close <= 0 ||
      low > high
    ) {
      return [];
    }

    return [{ time: candleTime, open, high, low, close, volume }];
  });

  return removeOutlierCandles(candles).slice(-limit);
}

export function parseBinanceKlines(data: unknown): Candle[] {
  if (!Array.isArray(data)) {
    throw new Error("Binance kline response was not an array.");
  }

  return (data as BinanceKline[]).map((item) => ({
    time: Math.round(Number(item[0]) / 1000),
    open: Number(item[1]),
    high: Number(item[2]),
    low: Number(item[3]),
    close: Number(item[4]),
    volume: Number(item[5])
  })).filter((candle) => (
    Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close)
  ));
}
