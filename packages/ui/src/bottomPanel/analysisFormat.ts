import type {
  AnalysisIndicator,
  AnalysisRunResponse,
  IndicatorConfig,
  MarketSymbol
} from "../../../shared/src/types";
import type { Language } from "../../../shared/src/translations";

export function buildIndicatorList(activeIndicators: IndicatorConfig): AnalysisIndicator[] {
  const enabled: AnalysisIndicator[] = [];
  if (activeIndicators.sma.active) enabled.push("SMA");
  if (activeIndicators.ema.active) enabled.push("EMA");
  if (activeIndicators.rsi.active) enabled.push("RSI");
  if (activeIndicators.macd.active) enabled.push("MACD");
  if (activeIndicators.bollinger.active) enabled.push("BOLLINGER");
  return enabled;
}

export function formatAnalysisResponse(
  data: AnalysisRunResponse,
  currentSymbol: MarketSymbol,
  timeframe: string,
  lang: Language
) {
  const trendLabel = {
    bullish: lang === "zh" ? "偏多" : lang === "tc" ? "偏多" : "Bullish",
    bearish: lang === "zh" ? "偏空" : lang === "tc" ? "偏空" : "Bearish",
    neutral: lang === "zh" ? "中性" : lang === "tc" ? "中性" : "Neutral"
  }[data.trend];

  const confidence = `${Math.round(data.confidence * 100)}%`;
  const support = data.levels.support.length > 0 ? data.levels.support.join(", ") : "-";
  const resistance = data.levels.resistance.length > 0 ? data.levels.resistance.join(", ") : "-";
  const signals = data.signals.length > 0
    ? data.signals.map((signal) => `${signal.type.toUpperCase()} @ ${signal.price} · ${signal.label}`).join("\n")
    : (lang === "zh" ? "暂无明确触发信号" : lang === "tc" ? "暫無明確觸發信號" : "No active trigger signal");

  return [
    `# ${currentSymbol.id} ${timeframe} ${lang === "zh" ? "量化分析" : lang === "tc" ? "量化分析" : "Quant Analysis"}`,
    `- ${lang === "zh" ? "趋势" : lang === "tc" ? "趨勢" : "Trend"}: **${trendLabel}**`,
    `- ${lang === "zh" ? "置信度" : lang === "tc" ? "置信度" : "Confidence"}: **${confidence}**`,
    `- ${lang === "zh" ? "支撑" : lang === "tc" ? "支撐" : "Support"}: ${support}`,
    `- ${lang === "zh" ? "压力" : lang === "tc" ? "壓力" : "Resistance"}: ${resistance}`,
    `## ${lang === "zh" ? "信号" : lang === "tc" ? "信號" : "Signals"}`,
    signals,
    `## ${lang === "zh" ? "摘要" : lang === "tc" ? "摘要" : "Summary"}`,
    data.summary
  ].join("\n");
}
