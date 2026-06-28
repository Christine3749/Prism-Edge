import type { AnalysisIndicator, IndicatorConfig } from "@shared/types";
export { buildMarketStatus, getFeedState } from "@shared/marketStatus";

export function buildActiveIndicatorList(indicatorConfig: IndicatorConfig): AnalysisIndicator[] {
  const enabled: AnalysisIndicator[] = [];
  if (indicatorConfig.sma.active) enabled.push("SMA");
  if (indicatorConfig.ema.active) enabled.push("EMA");
  if (indicatorConfig.rsi.active) enabled.push("RSI");
  if (indicatorConfig.macd.active) enabled.push("MACD");
  if (indicatorConfig.bollinger.active) enabled.push("BOLLINGER");
  return enabled;
}
