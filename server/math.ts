import type { Candle } from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function roundPrice(value: number, candles: Candle[]) {
  const sample = candles.find((candle) => Number.isFinite(candle.close));
  const decimalHint = sample ? String(sample.close).split(".")[1]?.length || 2 : 2;
  const decimals = clamp(decimalHint, 2, 8);
  return Number(value.toFixed(decimals));
}
