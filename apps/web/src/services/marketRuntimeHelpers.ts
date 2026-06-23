import type { AnalysisIndicator, IndicatorConfig, MarketDataStatus } from "@shared/types";

export function buildActiveIndicatorList(indicatorConfig: IndicatorConfig): AnalysisIndicator[] {
  const enabled: AnalysisIndicator[] = [];
  if (indicatorConfig.sma.active) enabled.push("SMA");
  if (indicatorConfig.ema.active) enabled.push("EMA");
  if (indicatorConfig.rsi.active) enabled.push("RSI");
  if (indicatorConfig.macd.active) enabled.push("MACD");
  if (indicatorConfig.bollinger.active) enabled.push("BOLLINGER");
  return enabled;
}

export function getFeedState(source: string, isLive: boolean): MarketDataStatus["state"] {
  if (isLive) return "live";
  if (source.toLowerCase().includes("yahoo")) return "delayed";
  return "simulated";
}
