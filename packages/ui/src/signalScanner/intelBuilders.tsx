import { Activity, AlertTriangle, Database, Newspaper, ShieldAlert, Sparkles, Target, Zap } from "lucide-react";
import { buildPrismIntelligence, describePrismIntelligence, type PrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol, NewsItem } from "@shared/types";
import type { Language } from "@shared/translations";
import { formatSigned } from "./formatters";
import type { IntelEvent, IntelStats, StrategyLens, StrategySuggestion } from "./types";

export function buildStrategySuggestions(
  currentSymbol: MarketSymbol,
  marketStatus: MarketDataStatus | undefined,
  analysisResult: AnalysisRunResponse | null | undefined,
  newsItems: NewsItem[],
  lang: Language
): StrategySuggestion[] {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const primaryNews = newsItems[0];
  const bullish = newsItems.filter((item) => item.sentiment === "bullish").length;
  const bearish = newsItems.filter((item) => item.sentiment === "bearish").length;
  const feedNeedsCheck = intelligence.risk === "feed" || marketStatus?.state === "delayed" || marketStatus?.state === "stale" || marketStatus?.state === "error";
  const defensive = intelligence.bias === "defense" || intelligence.risk === "stress";

  const primary: StrategySuggestion = analysisResult
    ? {
        id: "dgwm-result",
        title: zh ? "优先读取 DGWM 回执" : "Read DGWM result first",
        body: zh ? "后端模型已有回执，先看趋势、回撤、权限，再决定是否执行。" : "A model result exists; inspect trend, drawdown, and permission before action.",
        meta: "DGWM",
        tone: "emerald",
        stars: 5,
        icon: <Target className="h-3.5 w-3.5" />
      }
    : feedNeedsCheck
      ? {
          id: "feed-check",
          title: zh ? "先校验行情源" : "Verify market feed first",
          body: zh ? "当前数据存在延迟或折扣，先用主图和底部数据状态确认，再让模型判断。" : "Feed confidence is discounted; confirm source state before model review.",
          meta: "DATA",
          tone: "amber",
          stars: 4,
          icon: <Database className="h-3.5 w-3.5" />
        }
      : defensive
        ? {
            id: "defense-first",
            title: zh ? "进入防御观察" : "Move into defensive watch",
            body: zh ? "当前更像降频场景，先观察波动压力和回撤，不急着执行。" : "This reads as a lower-frequency setup; watch volatility pressure and drawdown first.",
            meta: "RISK",
            tone: "amber",
            stars: 4,
            icon: <ShieldAlert className="h-3.5 w-3.5" />
          }
        : intelligence.score >= 68
          ? {
              id: "chart-confirm",
              title: zh ? "主图确认突破结构" : "Confirm breakout on chart",
              body: zh ? `${currentSymbol.id} 排名较高，先看主图是否形成趋势延续或反转确认。` : `${currentSymbol.id} ranks well; confirm continuation or reversal on the main chart.`,
              meta: `S${intelligence.score}`,
              tone: "cyan",
              stars: 4,
              icon: <Activity className="h-3.5 w-3.5" />
            }
          : {
              id: "patient-watch",
              title: zh ? "保持观察，不追价" : "Stay patient; do not chase",
              body: zh ? `${brief.action} 等待更清晰的事件、价格结构或 DGWM 二次确认。` : `${brief.action} Wait for a clearer catalyst, structure, or DGWM confirmation.`,
              meta: `S${intelligence.score}`,
              tone: "slate",
              stars: 3,
              icon: <Sparkles className="h-3.5 w-3.5" />
            };

  const catalystTone: StrategySuggestion["tone"] = bearish > bullish ? "rose" : bullish > bearish ? "emerald" : "cyan";
  const catalyst: StrategySuggestion = {
    id: "catalyst-check",
    title: zh ? "检查事件是否能解释走势" : "Check whether catalyst explains move",
    body: primaryNews
      ? (zh ? `最新事件：${primaryNews.summary}` : `Latest catalyst: ${primaryNews.summary}`)
      : (zh ? "暂无强事件，先把行情视为技术结构驱动。" : "No strong catalyst yet; treat this as structure-driven."),
    meta: primaryNews?.sentiment || "NEWS",
    tone: catalystTone,
    stars: primaryNews ? 4 : 3,
    icon: <Newspaper className="h-3.5 w-3.5" />
  };

  const risk: StrategySuggestion = {
    id: "risk-frame",
    title: zh ? "先定风险边界" : "Define risk boundary first",
    body: zh ? "用支撑、阻力、回撤和波动压力决定是否拒绝交易或只做观察。" : "Use support, resistance, drawdown, and volatility pressure to decide reject vs watch.",
    meta: brief.risk,
    tone: defensive ? "amber" : "slate",
    stars: defensive ? 4 : 3,
    icon: <ShieldAlert className="h-3.5 w-3.5" />
  };

  const model: StrategySuggestion = {
    id: "model-review",
    title: zh ? "条件满足后送 DGWM 复核" : "Send to DGWM after conditions align",
    body: zh ? "当主图结构、新闻催化和数据可信度一致时，再运行 DGWM 诊断。" : "Run DGWM only after chart structure, catalyst, and data confidence align.",
    meta: analysisResult ? "READY" : "WAIT",
    tone: analysisResult ? "emerald" : "cyan",
    stars: analysisResult ? 5 : 4,
    icon: <Zap className="h-3.5 w-3.5" />
  };

  return [primary, catalyst, risk, model];
}

export function buildStrategyLens(
  currentSymbol: MarketSymbol,
  marketStatus: MarketDataStatus | undefined,
  analysisResult: AnalysisRunResponse | null | undefined,
  lang: Language
): StrategyLens {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const tone: StrategyLens["tone"] = intelligence.risk === "feed" || intelligence.risk === "stress"
    ? "amber"
    : intelligence.bias === "long"
      ? "emerald"
      : intelligence.bias === "short"
        ? "rose"
        : intelligence.score >= 62
          ? "cyan"
          : "slate";
  const stage = analysisResult
    ? "DGWM"
    : intelligence.score >= 72
      ? (zh ? "优先" : "Prime")
      : intelligence.bias === "defense"
        ? (zh ? "防御" : "Defense")
        : (zh ? "观察" : "Watch");
  const execution = analysisResult
    ? (zh ? "回执" : "Result")
    : intelligence.risk === "feed"
      ? (zh ? "校验" : "Verify")
      : intelligence.score >= 68
        ? (zh ? "主图" : "Chart")
        : (zh ? "等待" : "Wait");

  return {
    title: zh ? `${currentSymbol.id} 策略假设` : `${currentSymbol.id} Strategy Hypothesis`,
    body: zh
      ? `${brief.action} 左侧负责形成策略假设，底部 DGWM 决策台负责最终执行。`
      : `${brief.action} The left rail frames the hypothesis; the bottom DGWM deck owns execution.`,
    stage,
    score: intelligence.score,
    direction: brief.bias,
    risk: brief.risk,
    execution,
    confidence: intelligence.confidencePct,
    tone
  };
}

export function buildIntelStats(
  symbols: MarketSymbol[],
  currentSymbol: MarketSymbol,
  marketStatus: MarketDataStatus | undefined,
  analysisResult: AnalysisRunResponse | null | undefined
): IntelStats {
  const analyzed = symbols.slice(0, 48).map((symbol) => {
    const selected = symbol.id === currentSymbol.id;
    return buildPrismIntelligence(symbol, [], selected ? marketStatus : undefined, selected ? analysisResult : null);
  });
  return {
    defense: analyzed.filter((item) => item.bias === "defense" || item.risk === "stress").length,
    feedIssues: symbols.filter((symbol) => symbol.dataProvider === "yahoo" || symbol.lastDataState === "delayed" || symbol.lastDataState === "stale" || symbol.lastDataState === "error").length
  };
}

export function buildIntelEvents(
  symbols: MarketSymbol[],
  currentSymbol: MarketSymbol,
  marketStatus: MarketDataStatus | undefined,
  analysisResult: AnalysisRunResponse | null | undefined,
  lang: Language
): IntelEvent[] {
  const zh = lang === "zh" || lang === "tc";
  const analyzed = symbols.slice(0, 48).map((symbol) => {
    const selected = symbol.id === currentSymbol.id;
    const intelligence = buildPrismIntelligence(symbol, [], selected ? marketStatus : undefined, selected ? analysisResult : null);
    return { symbol, intelligence };
  });
  const byScore = [...analyzed].sort((a, b) => b.intelligence.score - a.intelligence.score);
  const byMove = [...symbols].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
  const currentIntel = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const currentBrief = describePrismIntelligence(currentIntel, currentSymbol, lang);
  const events: IntelEvent[] = [];
  const mover = byMove[0];
  const leader = byScore[0];
  const feedIssue = symbols.find((symbol) => symbol.lastDataState === "delayed" || symbol.lastDataState === "stale" || symbol.lastDataState === "error" || symbol.dataProvider === "yahoo");
  const crypto = analyzed.filter(({ symbol }) => symbol.type === "crypto" || symbol.market === "crypto");
  const nonCrypto = analyzed.filter(({ symbol }) => symbol.type !== "crypto" && symbol.market !== "crypto");
  const cryptoAvg = averageScore(crypto);
  const crossAvg = averageScore(nonCrypto);

  if (mover) {
    const up = mover.change24h >= 0;
    events.push({
      id: "mover",
      title: zh ? "异常波动" : "Volatility alert",
      body: zh
        ? `${mover.id} 24h ${up ? "上行" : "下行"} ${formatSigned(mover.change24h)}%，需要用主图确认是否只是噪声。`
        : `${mover.id} moved ${formatSigned(mover.change24h)}% in 24h; confirm on the main chart before acting.`,
      meta: up ? (zh ? "上行" : "up") : (zh ? "下行" : "down"),
      tone: up ? "emerald" : "rose",
      icon: <Activity className="h-3.5 w-3.5" />,
      symbol: mover
    });
  }

  if (leader) {
    events.push({
      id: "leader",
      title: zh ? "优先观察" : "Priority watch",
      body: zh
        ? `${leader.symbol.id} 在右侧矩阵中靠前，适合切到主图观察结构。`
        : `${leader.symbol.id} ranks high in the matrix; switch to the chart to inspect structure.`,
      meta: `S${leader.intelligence.score}`,
      tone: leader.intelligence.score >= 62 ? "cyan" : "slate",
      icon: <Zap className="h-3.5 w-3.5" />,
      symbol: leader.symbol
    });
  }

  if (currentIntel.bias === "defense" || currentIntel.risk === "stress" || currentIntel.risk === "feed") {
    events.push({
      id: "defense-current",
      title: zh ? "防御提示" : "Defense note",
      body: zh
        ? `${currentSymbol.id} 当前更像防御场景，底部决策台会给出完整动作。`
        : `${currentSymbol.id} is reading as defensive; the bottom deck owns the full action path.`,
      meta: currentBrief.risk,
      tone: "amber",
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      symbol: currentSymbol
    });
  }

  if (feedIssue) {
    events.push({
      id: "feed",
      title: zh ? "数据源提醒" : "Feed warning",
      body: zh
        ? `${feedIssue.id} 来自 ${feedIssue.dataProvider || feedIssue.lastSource || "gateway"}，可能存在延迟或可信度折扣。`
        : `${feedIssue.id} uses ${feedIssue.dataProvider || feedIssue.lastSource || "gateway"}; expect delay or confidence discount.`,
      meta: feedIssue.lastDataState || feedIssue.dataProvider || "feed",
      tone: "amber",
      icon: <Database className="h-3.5 w-3.5" />,
      symbol: feedIssue
    });
  }

  if (crypto.length > 0 && nonCrypto.length > 0) {
    const cryptoLead = cryptoAvg >= crossAvg;
    events.push({
      id: "rotation",
      title: zh ? "风格轮动" : "Style rotation",
      body: zh
        ? `${cryptoLead ? "Crypto" : "跨资产"} 平均信号更强，右侧矩阵负责继续排序。`
        : `${cryptoLead ? "Crypto" : "Cross-asset"} scores are stronger on average; the matrix handles ranking.`,
      meta: `${Math.round(cryptoAvg)}/${Math.round(crossAvg)}`,
      tone: cryptoLead ? "cyan" : "slate",
      icon: <Sparkles className="h-3.5 w-3.5" />
    });
  }

  events.push({
    id: "model",
    title: zh ? "模型状态" : "Model state",
    body: analysisResult
      ? (zh ? "DGWM 已有一次模型回执，底部决策台会优先展示后端结论。" : "DGWM response is available; the bottom deck prioritizes backend output.")
      : (zh ? "当前仍是前端情报推演，等待 DGWM 后端接管最终判断。" : "Frontend intelligence is active until DGWM backend owns the final decision."),
    meta: analysisResult ? "DGWM" : "LOCAL",
    tone: analysisResult ? "emerald" : "slate",
    icon: <AlertTriangle className="h-3.5 w-3.5" />
  });

  return events.slice(0, 6);
}

function averageScore(items: Array<{ intelligence: PrismIntelligence }>) {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item.intelligence.score, 0) / items.length;
}
