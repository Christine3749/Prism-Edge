import { Activity, Gauge, ListChecks, ShieldCheck } from "lucide-react";
import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, Candle, MarketDataStatus, MarketSymbol, NewsItem } from "@shared/types";
import type { Language } from "@shared/translations";
import type { QuantFeatureAccess } from "../types";
import { ExpandedDashboardStrip } from "./ExpandedDashboardStrip";
import { InferenceChainPanel, ModelParametersPanel, TrendDashboard } from "./TrendPanels";
import { DecisionMetric } from "./SmallCells";
import { biasTone, riskTone, scoreDeckShell, scoreTone } from "./helpers";
export function StrategyWorkbenchState(props: Omit<TrendWorkbenchProps, "compact">) {
  return <TrendWorkbenchState {...props} compact />;
}

interface TrendWorkbenchProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  featureAccess?: QuantFeatureAccess;
  lang: Language;
  news: NewsItem[];
  newsLoading: boolean;
  onRunAnalysis: () => void;
  compact: boolean;
}

export function TrendWorkbenchState({
  currentSymbol,
  candles,
  marketStatus,
  analysisResult,
  featureAccess,
  lang,
  news,
  newsLoading,
  onRunAnalysis,
  compact
}: TrendWorkbenchProps) {
  const intelligence = buildPrismIntelligence(currentSymbol, candles, marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const zh = lang === "zh" || lang === "tc";
  const marketState = marketStatus?.state || currentSymbol.lastDataState || "simulated";
  const sourceLabel = marketStatus?.source || currentSymbol.lastSource || currentSymbol.dataProvider || "gateway";
  const buttonLabel = featureAccess?.loading
    ? (zh ? "校验状态" : "Checking")
    : (zh ? "运行 DGWM 诊断" : "Run DGWM Diagnostic");
  const gridClass = compact
    ? "grid h-full min-h-[148px] grid-cols-1 gap-2 overflow-hidden pr-1 xl:grid-cols-[1.05fr_1.05fr_0.95fr_0.95fr]"
    : "grid h-full min-h-[210px] grid-cols-1 gap-2 overflow-y-auto pr-1 lg:grid-cols-2 2xl:grid-cols-[1.05fr_0.95fr_0.9fr_0.9fr]";

  if (compact) {
    return (
      <ExpandedDashboardStrip
        currentSymbol={currentSymbol}
        intelligence={intelligence}
        brief={brief}
        marketState={marketState}
        sourceLabel={sourceLabel}
        analysisLinked={Boolean(analysisResult)}
        candleCount={candles.length}
        newsCount={news.length}
        buttonLabel={buttonLabel}
        loading={Boolean(featureAccess?.loading)}
        lang={lang}
        onRunAnalysis={onRunAnalysis}
      />
    );
  }

  return (
    <div className={gridClass}>
      <section className={`flex min-h-0 flex-col rounded-md border p-3 ${scoreDeckShell(intelligence.score)}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-blue-300/70">
              <Activity className="h-3.5 w-3.5" />
              {zh ? "整体趋势 / DGWM" : "Market Trend / DGWM"}
            </div>
            <h4 className="mt-2 truncate text-[15px] font-black text-white">{brief.headline}</h4>
            <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-400">{brief.action}</p>
          </div>
          <div className={`shrink-0 text-right font-mono ${scoreTone(intelligence.score)}`}>
            <div className="text-[38px] font-black leading-none">{intelligence.score}</div>
            <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <DecisionMetric label={zh ? "方向" : "Bias"} value={brief.bias} tone={biasTone(intelligence.bias)} />
          <DecisionMetric label={zh ? "结构" : "Setup"} value={brief.setup} tone="text-blue-300/70" />
          <DecisionMetric label={zh ? "风险" : "Risk"} value={brief.risk} tone={riskTone(intelligence.risk)} />
          <DecisionMetric label={zh ? "数据" : "Feed"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2 text-[9px]">
          {brief.evidence.slice(0, 4).map((item) => (
            <div key={item} className="truncate rounded border border-[#12324a] bg-[#031426]/72 px-2 py-1.5 text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-blue-500/30 bg-[linear-gradient(135deg,rgba(6,16,29,0.96),rgba(5,9,20,0.98))] p-3 shadow-[inset_0_1px_0_rgba(92,130,170,0.08)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-blue-300/70">
            <Gauge className="h-3.5 w-3.5" />
            {zh ? "这只标的 / 趋势参数" : "Symbol Trend Parameters"}
          </div>
          <span className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">PARAM</span>
        </div>
        <TrendDashboard
          intelligence={intelligence}
          brief={brief}
          marketState={marketState}
          sourceLabel={sourceLabel}
          analysisLinked={Boolean(analysisResult)}
          lang={lang}
        />
      </section>

      <section className="flex min-h-0 flex-col rounded-md border border-blue-500/30 bg-[#07111f]/90 p-3">
        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-blue-300/70">
          <ListChecks className="h-3.5 w-3.5" />
          {zh ? "推理链" : "Inference Chain"}
        </div>
        <InferenceChainPanel
          intelligence={intelligence}
          brief={brief}
          marketState={marketState}
          sourceLabel={sourceLabel}
          newsCount={news.length}
          newsLoading={newsLoading}
          lang={lang}
        />
      </section>

      <section className="flex min-h-0 flex-col rounded-md border border-amber-400/20 bg-amber-500/[0.045] p-3">
        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-amber-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          {zh ? "大模型参数" : "Model Parameters"}
        </div>
        <ModelParametersPanel
          intelligence={intelligence}
          brief={brief}
          candleCount={candles.length}
          newsCount={news.length}
          marketState={marketState}
          sourceLabel={sourceLabel}
          analysisLinked={Boolean(analysisResult)}
          buttonLabel={buttonLabel}
          loading={Boolean(featureAccess?.loading)}
          lang={lang}
          onRunAnalysis={onRunAnalysis}
        />
      </section>
    </div>
  );
}