import { AlertTriangle, Activity, Crown, Database, Gauge, ListChecks, Play, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { AnalysisRunResponse, Candle, MarketDataStatus, MarketSymbol, NewsItem, QuantBacktestReport, QuantHealth, QuantModelRegistry } from "../../../shared/src/types";
import type { Language } from "../../../shared/src/translations";
import { buildPrismIntelligence, describePrismIntelligence, type PrismIntelligence } from "../../../shared/src/prismIntelligence";
import { AiMarkdown } from "./AiMarkdown";
import { QuantLabPanel } from "./QuantLabPanel";
import type { MembershipNotice, QuantFeatureAccess } from "./types";

interface AiAnalysisTabProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  marketStatus?: MarketDataStatus;
  aiAnalysis: string;
  aiLoading: boolean;
  analysisServiceFallback: boolean;
  analysisResult?: AnalysisRunResponse | null;
  quantHealth: QuantHealth | null;
  quantModels: QuantModelRegistry | null;
  backtest: QuantBacktestReport | null;
  backtestLoading: boolean;
  runtimeLoading: boolean;
  backtestError: string;
  membershipNotice?: MembershipNotice | null;
  featureAccess?: QuantFeatureAccess;
  lang: Language;
  onRunAnalysis: () => void;
  onRunBacktest: () => void;
  onRunRuntime: () => void;
  strategyMode?: boolean;
  news?: NewsItem[];
  newsLoading?: boolean;
}

export function AiAnalysisTab({
  currentSymbol,
  candles,
  marketStatus,
  aiAnalysis,
  aiLoading,
  analysisServiceFallback,
  analysisResult,
  quantHealth,
  quantModels,
  backtest,
  backtestLoading,
  runtimeLoading,
  backtestError,
  membershipNotice,
  featureAccess,
  lang,
  onRunAnalysis,
  onRunBacktest,
  onRunRuntime,
  strategyMode = false,
  news = [],
  newsLoading = false
}: AiAnalysisTabProps) {
  if (strategyMode && !aiLoading) {
    return (
      <StrategyWorkbenchState
        currentSymbol={currentSymbol}
        candles={candles}
        marketStatus={marketStatus}
        analysisResult={analysisResult}
        featureAccess={featureAccess}
        lang={lang}
        news={news}
        newsLoading={newsLoading}
        onRunAnalysis={onRunAnalysis}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {membershipNotice && aiAnalysis && <MembershipNoticeBanner notice={membershipNotice} />}
      <div className="min-h-0 flex-1 flex flex-col justify-between">
        {aiLoading ? (
          <LoadingState lang={lang} />
        ) : aiAnalysis ? (
          <AnalysisOutput
            aiAnalysis={aiAnalysis}
            analysisServiceFallback={analysisServiceFallback}
            analysisResult={analysisResult}
            quantHealth={quantHealth}
            quantModels={quantModels}
            backtest={backtest}
            backtestLoading={backtestLoading}
            runtimeLoading={runtimeLoading}
            backtestError={backtestError}
            membershipNotice={membershipNotice}
            featureAccess={featureAccess}
            lang={lang}
            onRunBacktest={onRunBacktest}
            onRunRuntime={onRunRuntime}
          />
        ) : (
          <TrendWorkbenchState
            currentSymbol={currentSymbol}
            candles={candles}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            featureAccess={featureAccess}
            lang={lang}
            news={news}
            newsLoading={newsLoading}
            onRunAnalysis={onRunAnalysis}
            compact={false}
          />
        )}
      </div>
    </div>
  );
}

function StrategyWorkbenchState(props: Omit<TrendWorkbenchProps, "compact">) {
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

function TrendWorkbenchState({
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
    ? "grid h-full min-h-[176px] grid-cols-1 gap-2 overflow-hidden pr-1 xl:grid-cols-[1.05fr_1.05fr_0.95fr_0.95fr]"
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
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-cyan-300">
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
          <DecisionMetric label={zh ? "结构" : "Setup"} value={brief.setup} tone="text-cyan-300" />
          <DecisionMetric label={zh ? "风险" : "Risk"} value={brief.risk} tone={riskTone(intelligence.risk)} />
          <DecisionMetric label={zh ? "数据" : "Feed"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2 text-[9px]">
          {brief.evidence.slice(0, 4).map((item) => (
            <div key={item} className="truncate rounded border border-slate-800 bg-slate-950/60 px-2 py-1.5 text-slate-300">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(6,16,29,0.96),rgba(5,9,20,0.98))] p-3 shadow-[inset_0_1px_0_rgba(125,211,252,0.08)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-cyan-300">
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

      <section className="flex min-h-0 flex-col rounded-md border border-cyan-400/20 bg-[#07111f]/90 p-3">
        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-cyan-300">
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

function ExpandedDashboardStrip({
  currentSymbol,
  intelligence,
  brief,
  marketState,
  sourceLabel,
  analysisLinked,
  candleCount,
  newsCount,
  buttonLabel,
  loading,
  lang,
  onRunAnalysis
}: {
  currentSymbol: MarketSymbol;
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  marketState: string;
  sourceLabel: string;
  analysisLinked: boolean;
  candleCount: number;
  newsCount: number;
  buttonLabel: string;
  loading: boolean;
  lang: Language;
  onRunAnalysis: () => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const trendPower = clampDashboard(50 + intelligence.momentumPct * 5 + (intelligence.score - 50) * 0.45);
  const momentumPower = clampDashboard(50 + intelligence.momentumPct * 8);
  const volPressure = clampDashboard(intelligence.volatilityPct * 15);
  const drawdownPressure = clampDashboard(Math.abs(intelligence.drawdownPct) * 5.8);
  const volumeHeat = clampDashboard(intelligence.volumeRatio * 46);
  const evidenceLoad = clampDashboard(candleCount * 0.35 + newsCount * 8 + intelligence.confidencePct * 0.25);
  const modelReadiness = analysisLinked ? 92 : 54;
  const symbol = currentSymbol.symbol;
  const modeLabel = analysisLinked ? "DGWM LINK" : "FRONTEND";

  return (
    <div className="flex h-full min-h-[176px] flex-col overflow-hidden border border-slate-800 bg-[#05070d]">
      <div className="flex h-6 shrink-0 items-center justify-between border-b border-slate-800 bg-[#090d14] px-3">
        <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Activity className="h-3 w-3" />
          {zh ? "DGWM 作战总线" : "DGWM Command Bus"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">
          {symbol} / {modeLabel} / {marketState}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[260px_repeat(9,minmax(122px,1fr))_226px] overflow-x-auto">
        <div className="flex min-w-[260px] flex-col justify-between border-r border-slate-800 bg-[#07101a] p-3">
          <div className="min-w-0">
            <div className="font-mono text-[7px] font-black uppercase tracking-[0.24em] text-cyan-300">
              {zh ? "单票决策摘要" : "Asset Decision Brief"}
            </div>
            <h4 className="mt-2 truncate text-[16px] font-black text-white">{symbol} {brief.headline.replace(symbol, "").trim()}</h4>
            <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{brief.action}</p>
          </div>
          <div className="grid grid-cols-4 gap-1 pt-2">
            <DecisionMetric label={zh ? "方向" : "Bias"} value={brief.bias} tone={biasTone(intelligence.bias)} />
            <DecisionMetric label={zh ? "结构" : "Setup"} value={brief.setup} tone="text-cyan-300" />
            <DecisionMetric label={zh ? "风险" : "Risk"} value={brief.risk} tone={riskTone(intelligence.risk)} />
            <DecisionMetric label={zh ? "数据" : "Feed"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
          </div>
        </div>

        <DashboardStripTile label={zh ? "趋势评分" : "Score"} value={`${intelligence.score}`} sub="MSIR SCORE" tone={scoreTone(intelligence.score)}>
          <MiniRing value={trendPower} />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "20K 动量" : "20K Mom"} value={formatSignedOneDecimal(intelligence.momentumPct)} sub={brief.setup} tone={biasTone(intelligence.bias)}>
          <MiniLine values={[42, 48, 44, 56, 60, trendPower, momentumPower]} />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "波动压力" : "Vol Press"} value={`${intelligence.volatilityPct.toFixed(1)}%`} sub={zh ? "压力阈值" : "Pressure"} tone={intelligence.volatilityPct > 4 ? "text-amber-300" : "text-cyan-300"}>
          <MiniBars values={[24, 36, 48, 42, volPressure, 38]} tone="cyan" />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "回撤压力" : "Drawdown"} value={`${intelligence.drawdownPct.toFixed(1)}%`} sub={brief.risk} tone={riskTone(intelligence.risk)}>
          <MiniMeter value={drawdownPressure} />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "量能热度" : "Volume"} value={`${intelligence.volumeRatio.toFixed(1)}x`} sub={sourceLabel} tone={intelligence.volumeRatio >= 1.25 ? "text-emerald-300" : "text-slate-300"}>
          <MiniBars values={[22, 34, volumeHeat, 46, 52, 40]} tone="emerald" />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "数据可信" : "Feed Trust"} value={`${intelligence.confidencePct}%`} sub={marketState} tone="text-emerald-300">
          <MiniMeter value={intelligence.confidencePct} />
        </DashboardStripTile>
        <DashboardStripTile label="DGWM" value={modeLabel} sub={analysisLinked ? (zh ? "后端已接入" : "Backend linked") : (zh ? "前端推演" : "Frontend staged")} tone={analysisLinked ? "text-emerald-300" : "text-cyan-300"}>
          <MiniMeter value={modelReadiness} />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "证据载荷" : "Evidence"} value={`${evidenceLoad}%`} sub={`${candleCount} K / ${newsCount} NEWS`} tone="text-cyan-300">
          <MiniRing value={evidenceLoad} />
        </DashboardStripTile>
        <DashboardStripTile label={zh ? "推理温度" : "Temp"} value="0.18" sub={zh ? "低温复核" : "Low variance"} tone="text-slate-200">
          <MiniLine values={[18, 18, 19, 18, 20, 18]} />
        </DashboardStripTile>

        <div className="flex min-w-[226px] flex-col justify-between border-l border-amber-300/20 bg-[#120f08] p-3">
          <div className="min-w-0">
            <div className="font-mono text-[7px] font-black uppercase tracking-[0.22em] text-amber-300">{zh ? "下一步动作" : "Next Action"}</div>
            <div className="mt-2 text-[14px] font-black text-slate-100">{zh ? "进入 DGWM 复核" : "Send To DGWM Review"}</div>
            <div className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-slate-500">
              {zh ? "当趋势、新闻、风险和数据可信度一致时，压入一次模型复核。" : "Push one model review when trend, catalysts, risk, and feed trust align."}
            </div>
          </div>
          <button
            onClick={onRunAnalysis}
            disabled={loading}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-cyan-400/40 bg-cyan-400/[0.12] px-3 text-[10px] font-black uppercase tracking-wider text-cyan-100 transition-colors hover:bg-cyan-400/[0.22] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-cyan-100 stroke-none" />
            <span>{buttonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
function TrendDashboard({
  intelligence,
  brief,
  marketState,
  sourceLabel,
  analysisLinked,
  lang
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  marketState: string;
  sourceLabel: string;
  analysisLinked: boolean;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const trendPower = clampDashboard(50 + intelligence.momentumPct * 5 + (intelligence.score - 50) * 0.45);
  const momentumPower = clampDashboard(50 + intelligence.momentumPct * 8);
  const volPressure = clampDashboard(intelligence.volatilityPct * 15);
  const drawdownPressure = clampDashboard(Math.abs(intelligence.drawdownPct) * 5.8);
  const volumeHeat = clampDashboard(intelligence.volumeRatio * 46);
  const modelReadiness = analysisLinked ? 92 : 54;

  return (
    <div className="mt-3 min-h-0 flex-1">
      <div className="grid grid-cols-2 gap-2">
        <DashboardGauge label={zh ? "趋势强度" : "Trend"} value={trendPower} readout={brief.bias} tone={biasTone(intelligence.bias)} />
        <DashboardGauge label={zh ? "20K 动量" : "Momentum"} value={momentumPower} readout={`${intelligence.momentumPct >= 0 ? "+" : ""}${intelligence.momentumPct.toFixed(1)}%`} tone={biasTone(intelligence.bias)} />
        <DashboardGauge label={zh ? "波动压力" : "Volatility"} value={volPressure} readout={`${intelligence.volatilityPct.toFixed(1)}%`} tone={intelligence.volatilityPct > 4 ? "text-amber-300" : "text-cyan-300"} />
        <DashboardGauge label={zh ? "回撤压力" : "Drawdown"} value={drawdownPressure} readout={`${intelligence.drawdownPct.toFixed(1)}%`} tone={riskTone(intelligence.risk)} />
        <DashboardGauge label={zh ? "量能热度" : "Volume Heat"} value={volumeHeat} readout={`${intelligence.volumeRatio.toFixed(1)}x`} tone={intelligence.volumeRatio >= 1.25 ? "text-emerald-300" : "text-slate-300"} />
        <DashboardGauge label={zh ? "模型准备" : "Model Ready"} value={modelReadiness} readout={analysisLinked ? "LINK" : "WAIT"} tone={analysisLinked ? "text-emerald-300" : "text-cyan-300"} />
      </div>
      <div className="mt-2 rounded border border-cyan-300/10 bg-slate-950/45 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-widest">
          <span className="text-slate-500">{zh ? "行情源" : "Feed"}</span>
          <span className="font-mono text-cyan-300">{sourceLabel} · {marketState}</span>
        </div>
        <div className="mt-1 text-[9px] leading-relaxed text-slate-500">
          {zh ? "趋势参数只回答一个问题：这只标的现在是否值得推进到 DGWM。" : "These parameters answer one question: should this symbol advance to DGWM?"}
        </div>
      </div>
    </div>
  );
}

function InferenceChainPanel({
  intelligence,
  brief,
  marketState,
  sourceLabel,
  newsCount,
  newsLoading,
  lang
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  marketState: string;
  sourceLabel: string;
  newsCount: number;
  newsLoading: boolean;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const catalystMeta = newsLoading
    ? (zh ? "同步重大行为" : "Syncing catalysts")
    : newsCount > 0
      ? `${newsCount} ${zh ? "条行为证据" : "behavior signals"}`
      : (zh ? "上方情报台参与判断" : "Intel desk feeds the thesis");

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between gap-2">
      <div className="space-y-1.5">
        <ActionStep index="01" title={zh ? "确认趋势结构" : "Confirm Trend Structure"} meta={`${brief.setup} / ${brief.bias}`} />
        <ActionStep index="02" title={zh ? "读取趋势参数" : "Read Trend Parameters"} meta={`20K ${formatSignedOneDecimal(intelligence.momentumPct)} · DD ${intelligence.drawdownPct.toFixed(1)}%`} />
        <ActionStep index="03" title={zh ? "吸收重大行为" : "Absorb Major Behavior"} meta={catalystMeta} />
        <ActionStep index="04" title={zh ? "形成 DGWM 假设" : "Form DGWM Thesis"} meta={`${brief.risk} · ${sourceLabel} / ${marketState}`} />
      </div>
      <div className="rounded border border-cyan-400/15 bg-cyan-400/[0.04] px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
        {zh
          ? "推理链把行情、参数、重大行为压缩成一条可复核的趋势假设。"
          : "The chain compresses price, parameters, and major behavior into a reviewable trend thesis."}
      </div>
    </div>
  );
}

function ModelParametersPanel({
  intelligence,
  brief,
  candleCount,
  newsCount,
  marketState,
  sourceLabel,
  analysisLinked,
  buttonLabel,
  loading,
  lang,
  onRunAnalysis
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  candleCount: number;
  newsCount: number;
  marketState: string;
  sourceLabel: string;
  analysisLinked: boolean;
  buttonLabel: string;
  loading: boolean;
  lang: Language;
  onRunAnalysis: () => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const evidenceLoad = clampDashboard(candleCount * 0.35 + newsCount * 8 + intelligence.confidencePct * 0.25);
  const modeLabel = analysisLinked ? "DGWM LINK" : "FRONTEND";

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-2">
      <div className="grid grid-cols-2 gap-1.5">
        <ModelParameter label={zh ? "模型链路" : "Runtime"} value={modeLabel} tone={analysisLinked ? "text-emerald-300" : "text-cyan-300"} />
        <ModelParameter label={zh ? "样本窗口" : "Sample"} value={`${candleCount} K`} tone="text-slate-200" />
        <ModelParameter label={zh ? "证据载荷" : "Evidence"} value={`${evidenceLoad}%`} tone="text-emerald-300" />
        <ModelParameter label={zh ? "推理温度" : "Temp"} value="0.18" tone="text-cyan-300" />
        <ModelParameter label={zh ? "可信阈值" : "Trust"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
        <ModelParameter label={zh ? "风险层" : "Risk"} value={brief.risk} tone={riskTone(intelligence.risk)} />
      </div>
      <div className="rounded border border-amber-400/15 bg-slate-950/50 px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
        {zh
          ? `大模型参数只解释当前 ${sourceLabel} / ${marketState} 的趋势假设，不直接替代 DGWM 执行。`
          : `Model parameters explain the ${sourceLabel} / ${marketState} trend thesis without replacing DGWM execution.`}
      </div>
      <button
        onClick={onRunAnalysis}
        disabled={loading}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-400/15 px-3 py-2 text-[11px] font-black text-cyan-100 transition-all hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5 fill-cyan-100 stroke-none" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
}

function DashboardGauge({ label, value, readout, tone }: { label: string; value: number; readout: string; tone: string }) {
  const width = Math.max(6, Math.min(100, value));
  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-[#070b14]/82 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
        <div className={`font-mono text-[12px] font-black ${tone}`}>{readout}</div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-950">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#5eead4)] shadow-[0_0_14px_rgba(34,211,238,0.28)]"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-700">
        <span>LOW</span>
        <span>{Math.round(width)}</span>
      </div>
    </div>
  );
}

function ModelParameter({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-800 bg-slate-950/60 px-2 py-2">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function StripMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-800 bg-slate-950/60 px-2 py-2">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function DashboardStripTile({ label, value, sub, tone, children }: { label: string; value: string; sub: string; tone: string; children: ReactNode }) {
  return (
    <div className="flex min-w-[132px] flex-col justify-between border-l border-slate-800 bg-[#050914]/92 p-3">
      <div className="min-w-0">
        <div className="truncate text-[7px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className={`mt-1 truncate font-mono text-[15px] font-black ${tone}`}>{value}</div>
        <div className="mt-0.5 truncate text-[8px] text-slate-500">{sub}</div>
      </div>
      <div className="mt-2 min-h-8">{children}</div>
    </div>
  );
}

function MiniMeter({ value }: { value: number }) {
  const width = Math.max(4, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#5eead4)] shadow-[0_0_14px_rgba(34,211,238,0.28)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MiniBars({ values, tone }: { values: number[]; tone: "cyan" | "emerald" }) {
  const color = tone === "emerald" ? "bg-emerald-300" : "bg-cyan-300";
  return (
    <div className="flex h-8 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`w-3 rounded-sm ${color} opacity-80`}
          style={{ height: `${Math.max(12, Math.min(100, value))}%` }}
        />
      ))}
    </div>
  );
}

function MiniLine({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${34 - (Math.max(0, Math.min(100, value)) / 100) * 30}`)
    .join(" ");
  return (
    <svg className="h-8 w-full overflow-visible" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="30" x2="100" y2="30" stroke="#1e293b" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MiniRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(#22d3ee ${clamped * 3.6}deg, rgba(15,23,42,0.9) 0deg)` }}
      >
        <div className="grid h-5 w-5 place-items-center rounded-full bg-[#050914] text-[7px] font-black text-cyan-200">{Math.round(clamped)}</div>
      </div>
      <MiniMeter value={value} />
    </div>
  );
}
function MembershipNoticeBanner({ notice }: { notice: MembershipNotice }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-100">
      <div className="flex min-w-0 items-start gap-2">
        <Crown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
        <div className="min-w-0">
          <div className="font-black text-amber-100">{notice.title}</div>
          <div className="mt-0.5 leading-relaxed text-amber-100/80">{notice.message}</div>
        </div>
      </div>
      <a href={notice.href} className="shrink-0 rounded border border-amber-300/40 px-2 py-1 font-black text-amber-100 no-underline hover:bg-amber-300/10">
        {notice.actionLabel}
      </a>
    </div>
  );
}

function LoadingState({ lang }: { lang: Language }) {
  return (
    <div className="flex flex-col items-center justify-center flex-grow py-4 gap-2">
      <div className="relative">
        <span className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin block"></span>
        <Sparkles className="h-3.5 w-3.5 text-cyan-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <div className="text-center">
        <p className="text-[11px] text-white font-bold">{lang === "zh" ? "正在折射多空对称对称率..." : lang === "tc" ? "正在折射多空對稱對稱率..." : "Refracting Technical Symmetries..."}</p>
        <p className="text-[9px] text-slate-500">{lang === "zh" ? "分析烛台图形阵、布林带宽度及 RSI 异常度。" : lang === "tc" ? "分析燭台圖形陣、布林帶寬度及 RSI 異常度。" : "Studying visual candelabra arrays, Bollinger spreads, and RSI anomalies."}</p>
      </div>
    </div>
  );
}

function AnalysisOutput({
  aiAnalysis,
  analysisServiceFallback,
  analysisResult,
  quantHealth,
  quantModels,
  backtest,
  backtestLoading,
  runtimeLoading,
  backtestError,
  membershipNotice,
  featureAccess,
  onRunBacktest,
  onRunRuntime,
  lang
}: {
  aiAnalysis: string;
  analysisServiceFallback: boolean;
  analysisResult?: AnalysisRunResponse | null;
  quantHealth: QuantHealth | null;
  quantModels: QuantModelRegistry | null;
  backtest: QuantBacktestReport | null;
  backtestLoading: boolean;
  runtimeLoading: boolean;
  backtestError: string;
  membershipNotice?: MembershipNotice | null;
  featureAccess?: QuantFeatureAccess;
  onRunBacktest: () => void;
  onRunRuntime: () => void;
  lang: Language;
}) {
  return (
    <div className="space-y-2 max-h-44 sm:max-h-none overflow-y-auto pr-1">
      {analysisServiceFallback && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-300 text-[10px] leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
          <span>{lang === "zh" ? "后端模型服务未连接或不可用，当前显示棱镜本地模拟接口输出。" : lang === "tc" ? "後端模型服務未連接或不可用，當前顯示稜鏡本地模擬接口輸出。" : "Backend model service is unavailable. Local Prism-Edge simulator output is shown."}</span>
        </div>
      )}
      {analysisResult && <QuantSnapshot result={analysisResult} lang={lang} />}
      <QuantLabPanel
        health={quantHealth}
        models={quantModels}
        backtest={backtest}
        runtimeDiagnostic={analysisResult?.runtimeDiagnostic}
        loading={backtestLoading}
        runtimeLoading={runtimeLoading}
        error={backtestError}
        membershipNotice={membershipNotice}
        featureAccess={featureAccess}
        canRun={Boolean(analysisResult)}
        lang={lang}
        onRunBacktest={onRunBacktest}
        onRunRuntime={onRunRuntime}
      />
      <div className="bg-slate-900 p-3 border border-slate-800 rounded-lg">
        <AiMarkdown text={aiAnalysis} />
      </div>
    </div>
  );
}

function QuantSnapshot({ result, lang }: { result: AnalysisRunResponse; lang: Language }) {
  const permission = result.tradePermission;
  const reward = result.netReward;
  const labels = getQuantLabels(lang);
  const cards = [
    {
      label: labels.structure,
      value: result.regime ? labels.regime[result.regime] : "-",
      meta: `${labels.error} ${formatRatio(result.structuralError)}`
    },
    {
      label: labels.permission,
      value: permission ? labels.mode[permission.mode] : "-",
      meta: permission?.allowed ? labels.allowed : labels.blocked,
      tone: permission?.allowed ? "text-emerald-300" : "text-rose-300"
    },
    {
      label: labels.netReward,
      value: reward ? formatSignedPercent(reward.mean) : "-",
      meta: reward ? `CVaR ${formatSignedPercent(reward.cvar)}` : "-"
    },
    {
      label: "Bellman",
      value: formatRatio(result.bellmanResidual),
      meta: `${labels.gap} ${formatRatio(result.spectralGap)}`
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card) => (
        <div key={card.label} className="border border-slate-800 bg-slate-900/80 rounded-md px-2.5 py-2 min-h-16">
          <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{card.label}</div>
          <div className={`text-[13px] font-black mt-1 ${card.tone || "text-slate-100"}`}>{card.value}</div>
          <div className="text-[9px] text-slate-500 mt-0.5 truncate">{card.meta}</div>
        </div>
      ))}
      {permission && permission.reasons.length > 0 && (
        <div className="col-span-2 lg:col-span-4 border border-rose-500/20 bg-rose-500/10 rounded-md px-2.5 py-1.5 text-[10px] text-rose-200">
          <span className="font-bold">{labels.riskReasons}: </span>
          <span>{permission.reasons.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}

function ActionStep({ index, title, meta }: { index: string; title: string; meta: string }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded border border-slate-800 bg-slate-950/60 p-2">
      <div className="font-mono text-[10px] font-black text-cyan-300">{index}</div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-black text-slate-100">{title}</div>
        <div className="mt-0.5 truncate text-[8px] text-slate-500">{meta}</div>
      </div>
    </div>
  );
}

function DecisionMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-950/60 px-2.5 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function getQuantLabels(lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  return {
    structure: zh ? "市场结构" : "Structure",
    permission: zh ? "交易许可" : "Permission",
    netReward: zh ? "净奖励" : "Net Reward",
    error: zh ? "误差" : "EDG",
    gap: zh ? "谱间隙" : "Gap",
    allowed: zh ? "允许交易" : "Allowed",
    blocked: zh ? "需要降级/拒绝" : "Review or reject",
    riskReasons: zh ? "风险原因" : "Risk reasons",
    regime: {
      trend: zh ? "趋势" : "Trend",
      range: zh ? "震荡" : "Range",
      breakout: zh ? "突破" : "Breakout",
      stress: zh ? "压力" : "Stress",
      transition: zh ? "切换" : "Transition"
    },
    mode: {
      attack: zh ? "进攻" : "Attack",
      defensive: zh ? "防守" : "Defensive",
      reduce_only: zh ? "只减仓" : "Reduce only",
      hedge_only: zh ? "仅对冲" : "Hedge only",
      reject: zh ? "拒绝" : "Reject",
      manual_review: zh ? "人工复核" : "Manual review"
    }
  };
}

function scoreDeckShell(score: number) {
  if (score >= 74) return "border-emerald-400/30 bg-emerald-500/[0.06] shadow-[0_0_28px_rgba(16,185,129,0.08)]";
  if (score >= 62) return "border-cyan-400/30 bg-cyan-500/[0.07] shadow-[0_0_28px_rgba(34,211,238,0.08)]";
  if (score <= 38) return "border-rose-400/25 bg-rose-500/[0.06] shadow-[0_0_28px_rgba(244,63,94,0.08)]";
  return "border-slate-800 bg-slate-900/70";
}

function scoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-cyan-300";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}

function biasTone(bias: PrismIntelligence["bias"]) {
  if (bias === "long") return "text-emerald-300";
  if (bias === "short") return "text-rose-300";
  if (bias === "defense") return "text-amber-300";
  return "text-slate-400";
}

function riskTone(risk: PrismIntelligence["risk"]) {
  if (risk === "normal") return "text-emerald-300";
  if (risk === "elevated") return "text-amber-300";
  if (risk === "stress") return "text-rose-300";
  return "text-orange-300";
}

function clampDashboard(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatRatio(value?: number) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}

function formatSignedPercent(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}

function formatSignedOneDecimal(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
