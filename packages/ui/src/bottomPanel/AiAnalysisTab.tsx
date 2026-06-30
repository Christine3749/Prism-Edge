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
  const pressureIndex = clampDashboard((volPressure + drawdownPressure) / 2);
  const catalystIndex = clampDashboard(newsCount * 16 + Math.abs(intelligence.momentumPct) * 4 + 24);
  const c2dIndex = clampDashboard(intelligence.confidencePct * 0.68 + modelReadiness * 0.32);
  const modeLabel = analysisLinked ? "DGWM LINK" : "FRONTEND";
  const signalLabel = String(brief.bias).toUpperCase();
  const growthLabel = currentSymbol.type === "crypto" ? "FLOW MOM" : "EPS";
  const carryLabel = currentSymbol.type === "crypto" ? "PERP CARRY" : "DIVIDEND";
  const carryValue = currentSymbol.type === "crypto" ? (intelligence.momentumPct >= 0 ? "POSITIVE" : "NEGATIVE") : "NO FORECAST";
  const feeReadout = currentSymbol.type === "crypto" ? `${formatSignedOneDecimal(intelligence.momentumPct * 0.18)}` : `${Math.max(0.3, pressureIndex / 4.8).toFixed(2)}%`;
  const insiderMeter = clampDashboard(44 + intelligence.momentumPct * 4 + newsCount * 3);
  const analystChange = clampDashboard(42 + (intelligence.score - 50) * 0.85 + (analysisLinked ? 12 : 0));
  const valuationIndustry = clampDashboard(58 - intelligence.drawdownPct * 0.8 + intelligence.momentumPct * 2);
  const valuationHistory = clampDashboard(42 + intelligence.score * 0.42 - volPressure * 0.22);
  const optionSkew = clampDashboard(38 + volPressure * 0.42 + Math.abs(intelligence.momentumPct) * 4);
  const ctbPressure = clampDashboard(pressureIndex + (brief.risk === "stress" ? 18 : brief.risk === "elevated" ? 8 : 0));

  return (
    <div className="war-bottom-ribbon flex h-full min-h-[148px] flex-col overflow-hidden border-t border-[#12324a] bg-[#000814]">
      <div className="war-bottom-strip-header flex h-7 shrink-0 items-center justify-between border-b border-[#12324a] bg-[#020b18] px-3 font-mono text-[8px] font-black uppercase tracking-[0.22em]">
        <div className="flex min-w-0 items-center gap-2 text-blue-200/75">
          <Activity className="h-3 w-3" />
          <span className="truncate">{zh ? "单票指标仪表带" : "Single Asset Factor Ribbon"}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-slate-500">
          <span>{currentSymbol.id}</span>
          <span>/</span>
          <span>{sourceLabel}</span>
          <span>/</span>
          <span>{marketState}</span>
        </div>
      </div>

      <div className="war-bottom-rail flex min-h-0 flex-1 overflow-x-auto bg-[#000814] no-scrollbar">
        <WarBottomTile label="PERF" value={formatSignedOneDecimal(currentSymbol.change24h)} sub={zh ? "价格表现" : "price move"} tone={currentSymbol.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}>
          <WarBottomLevelTrack value={trendPower} tone={currentSymbol.change24h >= 0 ? "emerald" : "rose"} />
        </WarBottomTile>

        <WarBottomTile label="FEES" value={feeReadout} sub={zh ? "借券/资金费" : "borrow/funding"} tone={pressureIndex > 62 ? "text-amber-300" : "text-blue-300/70"}>
          <WarBottomRangeTrack value={pressureIndex} tone={pressureIndex > 62 ? "amber" : "cyan"} marker={volPressure} />
        </WarBottomTile>

        <WarBottomTile label="INSIDERS" value={insiderMeter >= 55 ? (zh ? "净买入" : "NET BUY") : (zh ? "观察" : "WATCH")} sub={zh ? "大户/内部人代理" : "whale proxy"} tone={insiderMeter >= 55 ? "text-emerald-300" : "text-slate-300"}>
          <WarBottomInsiderSignal value={insiderMeter} />
        </WarBottomTile>

        <WarBottomAnalystTile value={analystChange} />

        <WarBottomTile label="EVENTS" value={`${newsCount}`} sub={zh ? "事件密度" : "upcoming events"} tone="text-amber-300">
          <WarBottomBars values={[18, 24, catalystIndex, 42, 34, 56]} tone="amber" />
          <WarBottomSmallText left={zh ? "开放" : "open"} right={`${candleCount}K`} />
        </WarBottomTile>

        <WarBottomScoreTile label="STOCK SCORE" value={intelligence.score} sub="MSIR" />

        <WarBottomTile label={growthLabel} value={formatSignedOneDecimal(intelligence.momentumPct * 0.62)} sub={currentSymbol.type === "crypto" ? "flow proxy" : "earnings proxy"} tone={intelligence.momentumPct >= 0 ? "text-emerald-300" : "text-rose-300"}>
          <WarBottomLevelTrack value={momentumPower} tone={intelligence.momentumPct >= 0 ? "emerald" : "rose"} />
        </WarBottomTile>

        <WarBottomTile label="TRADER SIGNALS" value={signalLabel} sub={brief.setup} tone={biasTone(intelligence.bias)} wide>
          <WarBottomStars value={trendPower} />
          <WarBottomSmallText left={brief.risk} right={formatSignedOneDecimal(intelligence.drawdownPct)} />
        </WarBottomTile>

        <WarBottomTile label={carryLabel} value={carryValue} sub={zh ? "收益/持仓成本" : "carry profile"} tone={currentSymbol.type === "crypto" ? (intelligence.momentumPct >= 0 ? "text-emerald-300" : "text-rose-300") : "text-slate-300"} wide>
          <WarBottomDividendState active={currentSymbol.type === "crypto"} value={clampDashboard(48 + intelligence.momentumPct * 5)} />
        </WarBottomTile>

        <WarBottomTile label="VOLUME" value={`${intelligence.volumeRatio.toFixed(1)}x`} sub={sourceLabel} tone={intelligence.volumeRatio >= 1.25 ? "text-emerald-300" : "text-slate-300"}>
          <WarBottomBars values={[24, 38, volumeHeat, 48, 42, 35]} tone="cyan" />
        </WarBottomTile>

        <WarBottomTile label="VALUATION" value={`${Math.round(valuationIndustry)}`} sub={zh ? "相对位置" : "vs industry"} tone="text-slate-100" wide>
          <WarBottomDualMeter top={valuationIndustry} bottom={valuationHistory} />
        </WarBottomTile>

        <WarBottomTile label="OPTIONS" value={currentSymbol.type === "crypto" ? "PERP" : "WATCH"} sub={zh ? "波动/偏斜" : "vol/skew"} tone={optionSkew > 62 ? "text-amber-300" : "text-blue-300/70"}>
          <WarBottomRangeTrack value={optionSkew} tone={optionSkew > 62 ? "amber" : "cyan"} marker={volPressure} />
        </WarBottomTile>

        <WarBottomTile label="CTB" value={`${(ctbPressure / 18).toFixed(2)}%`} sub={zh ? "空头压力" : "short pressure"} tone={ctbPressure > 62 ? "text-rose-300" : "text-blue-300/70"}>
          <WarBottomRangeTrack value={ctbPressure} tone={ctbPressure > 62 ? "rose" : "cyan"} marker={pressureIndex} />
        </WarBottomTile>

        <div className="war-bottom-action-tile relative flex min-w-[204px] flex-col justify-between border-l border-amber-300/35 bg-[#06111d] p-2.5 shadow-[inset_3px_0_0_rgba(251,191,36,0.7)]">
          <div className="min-w-0">
            <div className="font-mono text-[7px] font-black uppercase tracking-[0.24em] text-amber-300">{zh ? "下一步动作" : "Next Action"}</div>
            <div className="mt-2 truncate text-[13px] font-black text-slate-100">{zh ? "进入 DGWM 复核" : "Send To DGWM Review"}</div>
            <div className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{brief.action}</div>
          </div>
          <button
            onClick={onRunAnalysis}
            disabled={loading}
            className="mt-2 flex h-8 w-full items-center justify-center gap-2 border border-blue-500/30 bg-blue-500/25 px-3 text-[10px] font-black uppercase tracking-wider text-blue-100/80 shadow-[inset_0_0_0_1px_rgba(54,96,130,0.08)] transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-blue-100/80 stroke-none" />
            <span className="truncate">{buttonLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
function WarBottomHeader({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="war-bottom-card-header pointer-events-none flex h-3.5 min-w-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap opacity-[0.65]">
      <span className="min-w-0 truncate font-mono text-[6.5px] font-black uppercase leading-none tracking-[0.14em] text-slate-600">{label}</span>
      <span className={`shrink-0 font-mono text-[6.5px] font-black uppercase leading-none tracking-[0.06em] ${tone}`}>{value}</span>
      <span className="min-w-0 truncate text-[6.5px] font-semibold leading-none text-slate-600">{sub}</span>
    </div>
  );
}

function WarBottomTile({ label, value, sub, tone, children, wide = false }: { label: string; value: string; sub: string; tone: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`war-bottom-tile relative ${wide ? "min-w-[156px]" : "min-w-[132px]"} flex-1 overflow-hidden border-r border-[#172434] bg-[#050a11] px-2 py-1`}>
      <div className="war-bottom-label-row absolute left-2 right-2 top-1 z-10">
        <WarBottomHeader label={label} value={value} sub={sub} tone={tone} />
      </div>
      <div className="war-bottom-visual absolute inset-x-2 bottom-0.5 top-3 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function WarBottomAnalystTile({ value }: { value: number }) {
  const active = value >= 62 ? "raise" : value <= 38 ? "lower" : "hold";
  const changeCount = Math.max(0, Math.round(Math.abs(value - 50) / 18));
  const label = active === "raise" ? "RAISE" : active === "lower" ? "LOWER" : "NO CHG";
  const tone = active === "raise" ? "text-emerald-300" : active === "lower" ? "text-rose-300" : "text-slate-200/85";
  return (
    <div className="war-bottom-tile war-bottom-analyst-tile relative min-w-[156px] flex-1 overflow-hidden border-r border-[#172434] bg-[#050a11] px-2 py-1">
      <div className="war-bottom-label-row absolute left-2 right-2 top-1 z-10">
        <WarBottomHeader label="ANALYSTS" value={label} sub={`${changeCount} chg`} tone={tone} />
      </div>
      <div className="war-bottom-visual absolute inset-x-2 bottom-0.5 top-3 flex flex-col items-center justify-center font-mono">
        <div className="flex items-center justify-center gap-1.5 opacity-80">
          <span className={`rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${active === "raise" ? "border-emerald-300/45 bg-emerald-300/[0.09] text-emerald-200" : "border-emerald-300/20 bg-transparent text-emerald-300/45"}`}>RAISE</span>
          <span className={`rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${active === "lower" ? "border-rose-300/45 bg-rose-300/[0.09] text-rose-200" : "border-rose-300/20 bg-transparent text-rose-300/45"}`}>LOWER</span>
          <span className={`rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${active === "hold" ? "border-slate-200/45 bg-slate-200/[0.07] text-slate-100/75" : "border-slate-500/20 bg-transparent text-slate-600"}`}>NO CHG</span>
        </div>
        <div className="mt-2 text-center text-[8px] font-black uppercase leading-tight tracking-[0.08em] text-slate-400/70">ANALYST CHANGES</div>
        <div className="mt-1.5 flex items-center justify-center gap-3 text-[8px] opacity-80">
          <span className={active === "lower" ? "text-rose-300" : "text-rose-300/28"}>●</span>
          <span className={active === "lower" ? "text-rose-300" : "text-rose-300/28"}>●</span>
          <span className={active === "raise" ? "text-cyan-300" : "text-cyan-300/28"}>●</span>
          <span className={active === "raise" ? "text-emerald-300" : "text-emerald-300/28"}>●</span>
        </div>
      </div>
    </div>
  );
}
function WarBottomScoreTile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="war-bottom-tile war-bottom-score-tile relative min-w-[156px] flex-1 overflow-hidden border-r border-[#172434] bg-[#050a11] px-2 py-1">
      <div className="war-bottom-label-row absolute left-2 right-2 top-1 z-10">
        <WarBottomHeader label={label} value={`${Math.round(value)}`} sub={sub} tone="text-blue-100/75" />
      </div>
      <div className="war-bottom-visual absolute inset-x-2 bottom-0.5 top-3 flex items-center justify-center">
        <WarBottomScore value={value} />
      </div>
    </div>
  );
}

function WarBottomMeter({ value, tone, compact = false }: { value: number; tone: "cyan" | "emerald" | "amber" | "rose"; compact?: boolean }) {
  const width = Math.max(4, Math.min(100, value));
  const fill = {
    cyan: "bg-blue-500/25",
    emerald: "bg-emerald-300",
    amber: "bg-amber-300",
    rose: "bg-rose-300"
  }[tone];
  return (
    <div className={compact ? "mt-1 w-full" : "w-full"}>
      <div className="h-1.5 bg-[#070d16]">
        <div className={`h-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-700">
          <span>LOW</span>
          <span>{Math.round(width)}</span>
        </div>
      )}
    </div>
  );
}

function WarBottomBars({ values, tone }: { values: number[]; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const color = {
    cyan: "bg-blue-500/25",
    emerald: "bg-emerald-300",
    amber: "bg-amber-300",
    rose: "bg-rose-300"
  }[tone];
  return (
    <div className="war-bottom-bars flex h-16 w-full items-end justify-center gap-1.5" data-war-bars-tone={tone}>
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`war-bottom-bar w-3 ${color} opacity-85`}
          style={{ height: `${Math.max(12, Math.min(100, value))}%` }}
        />
      ))}
    </div>
  );
}

function WarBottomLevelTrack({ value, tone }: { value: number; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const clamped = Math.max(4, Math.min(96, value));
  const wave = buildWarBottomWave(clamped, clamped * 0.031, 38);
  return <WarBottomSparkline values={wave} tone={tone} marker={clamped} right={`${Math.round(clamped)}`} />;
}

function WarBottomRangeTrack({ value, marker, tone }: { value: number; marker: number; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const clamped = Math.max(4, Math.min(96, value));
  const markerX = Math.max(4, Math.min(96, marker));
  const wave = buildWarBottomWave(clamped, markerX * 0.027, 34);
  return <WarBottomSparkline values={wave} tone={tone} marker={markerX} right="HIGH" />;
}

function WarBottomSparkline({ values, tone, marker, right = "HIGH" }: { values: number[]; tone: "cyan" | "emerald" | "amber" | "rose"; marker?: number; right?: string }) {
  const stroke = {
    cyan: "#46779a",
    emerald: "#6ee7b7",
    amber: "#facc15",
    rose: "#fb7185"
  }[tone];
  const fill = {
    cyan: "rgba(70,119,154,0.11)",
    emerald: "rgba(110,231,183,0.12)",
    amber: "rgba(250,204,21,0.11)",
    rose: "rgba(251,113,133,0.11)"
  }[tone];
  const clampedValues = values.map((value) => Math.max(4, Math.min(96, value)));
  const linePath = buildWarBottomCurve(clampedValues, 100, 40);
  const areaPath = `${linePath} L 100 39 L 0 39 Z`;
  const markerX = marker === undefined ? null : Math.max(4, Math.min(96, marker));

  return (
    <div className="war-bottom-sparkline w-full px-0.5">
      <svg className="war-bottom-sparkline-svg h-16 w-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 31.5 H100" stroke="#1c2b3d" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <path d="M0 20.5 H100" stroke="#111c2a" strokeWidth="0.45" vectorEffect="non-scaling-stroke" />
        <path d={areaPath} fill={fill} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" vectorEffect="non-scaling-stroke" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {markerX !== null && <path d={`M ${markerX} 7 V 36`} stroke="#e5e7eb" strokeWidth="0.8" opacity="0.78" vectorEffect="non-scaling-stroke" />}
      </svg>
      <WarBottomSmallText left="LOW" right={right} />
    </div>
  );
}

function buildWarBottomWave(target: number, phase: number, start = 36) {
  const count = 13;
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const trend = start + (target - start) * t;
    const wave = Math.sin(t * Math.PI * 2.45 + phase) * 7.2 + Math.sin(t * Math.PI * 5.1 + phase * 0.7) * 2.4;
    return Math.max(8, Math.min(92, trend + wave));
  });
}

function buildWarBottomCurve(values: number[], width: number, height: number) {
  if (values.length === 0) return `M 0 ${height / 2}`;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 4 - (value / 100) * (height - 9);
    return { x, y };
  });
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] || current;
    const after = points[index + 2] || next;
    const tension = 0.18;
    const cp1x = current.x + (next.x - previous.x) * tension;
    const cp1y = current.y + (next.y - previous.y) * tension;
    const cp2x = next.x - (after.x - current.x) * tension;
    const cp2y = next.y - (after.y - current.y) * tension;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}
function WarBottomScore({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const activeLength = clamped * 0.72;
  return (
    <svg className="war-bottom-score-gauge h-[104px] w-[146px] overflow-visible" viewBox="0 0 120 94" aria-hidden="true">
      <circle
        cx="60"
        cy="54"
        r="35"
        fill="none"
        stroke="#102033"
        strokeWidth="14"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="72 100"
        strokeDashoffset="14"
        transform="rotate(126 60 54)"
      />
      <circle
        cx="60"
        cy="54"
        r="35"
        fill="none"
        stroke="#56d8d5"
        strokeWidth="14"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${activeLength} 100`}
        strokeDashoffset="14"
        transform="rotate(126 60 54)"
        opacity="0.9"
        style={{ filter: "drop-shadow(0 0 8px rgba(86,216,213,0.35))" }}
      />
      <text x="60" y="61" textAnchor="middle" className="fill-blue-100/80 font-mono text-[20px] font-black">{Math.round(clamped)}</text>
    </svg>
  );
}

function WarBottomPills({ items, active }: { items: string[]; active: number }) {
  return (
    <div className="flex w-full items-center justify-center gap-1">
      {items.map((item, index) => (
        <span
          key={item}
          className={`min-w-[32px] border px-1.5 py-0.5 text-center font-mono text-[7px] font-black uppercase tracking-wider ${index === active ? "border-blue-300/35 bg-blue-300/[0.11] text-blue-100/80" : "border-[#152638] bg-transparent text-slate-600"}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function WarBottomInsiderSignal({ value }: { value: number }) {
  const marker = Math.max(8, Math.min(92, value));
  const positive = value >= 55;
  return (
    <div className="w-full space-y-2.5 font-mono">
      <div className="flex items-center justify-center gap-4">
        <span className="rounded-full border border-rose-400/35 bg-rose-400/[0.06] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-rose-300/75">NET SALE</span>
        <span className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] ${positive ? "border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200/85" : "border-blue-300/25 bg-blue-300/[0.05] text-blue-200/65"}`}>HOLD</span>
      </div>
      <div>
        <div className="mb-1 text-[6px] font-black uppercase tracking-[0.14em] text-slate-600/80">INSIDER MOMENTUM</div>
        <div className="relative h-3 bg-gradient-to-r from-rose-400/65 via-slate-600/45 to-cyan-300/75 shadow-[0_0_10px_rgba(71,119,154,0.12)]">
          <span className="absolute top-1/2 h-7 w-px -translate-y-1/2 bg-slate-100/90" style={{ left: `${marker}%` }} />
        </div>
      </div>
    </div>
  );
}

function WarBottomAnalystDots({ value }: { value: number }) {
  const up = value >= 55;
  const down = value <= 42;
  return (
    <div className="mt-2 w-full text-center font-mono">
      <div className="flex items-center justify-center gap-2 text-[9px] font-black">
        <span className={down ? "text-rose-300" : "text-slate-700"}>●</span>
        <span className={up ? "text-blue-300/70" : "text-slate-700"}>●</span>
        <span className={up ? "text-emerald-300" : "text-slate-700"}>●</span>
      </div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">ANALYST CHANGES</div>
    </div>
  );
}

function WarBottomStars({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.round(value / 20)));
  return (
    <div className="space-y-1">
      <div className="font-mono text-[11px] tracking-[0.08em]">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < stars ? "text-amber-300" : "text-slate-700"}>★</span>
        ))}
      </div>
      <WarBottomMeter value={value} tone={value >= 68 ? "emerald" : "cyan"} compact />
    </div>
  );
}

function WarBottomSmallText({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[6px] font-black uppercase tracking-widest text-slate-700/80">
      <span className="truncate">{left}</span>
      <span className="truncate text-right">{right}</span>
    </div>
  );
}

function WarBottomDividendState({ active, value }: { active: boolean; value: number }) {
  if (!active) {
    return (
      <div className="w-full text-center font-mono">
        <div className="text-[9px] font-black uppercase leading-snug text-slate-400/75">NO DIVIDEND</div>
        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-slate-700/85">FORECAST</div>
      </div>
    );
  }
  return (
    <div className="w-full text-center">
      <div className="mx-auto grid h-7 w-[86px] place-items-center border border-emerald-300/25 bg-emerald-300/[0.06] font-mono text-[8px] font-black uppercase text-emerald-200/85">PERP CARRY</div>
      <WarBottomMeter value={value} tone="emerald" compact />
    </div>
  );
}

function WarBottomDualMeter({ top, bottom }: { top: number; bottom: number }) {
  return (
    <div className="space-y-2">
      <div>
        <WarBottomSmallText left="VS INDUSTRY" right={`${Math.round(top)}`} />
        <WarBottomMeter value={top} tone={top >= 62 ? "amber" : "cyan"} compact />
      </div>
      <div>
        <WarBottomSmallText left="VS HISTORY" right={`${Math.round(bottom)}`} />
        <WarBottomMeter value={bottom} tone={bottom >= 62 ? "emerald" : "cyan"} compact />
      </div>
    </div>
  );
}
function formatBottomPrice(price: number, precision: number) {
  if (!Number.isFinite(price) || price <= 0) return "--";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(precision, 2),
    maximumFractionDigits: Math.min(Math.max(precision, 2), 5)
  });
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
        <DashboardGauge label={zh ? "波动压力" : "Volatility"} value={volPressure} readout={`${intelligence.volatilityPct.toFixed(1)}%`} tone={intelligence.volatilityPct > 4 ? "text-amber-300" : "text-blue-300/70"} />
        <DashboardGauge label={zh ? "回撤压力" : "Drawdown"} value={drawdownPressure} readout={`${intelligence.drawdownPct.toFixed(1)}%`} tone={riskTone(intelligence.risk)} />
        <DashboardGauge label={zh ? "量能热度" : "Volume Heat"} value={volumeHeat} readout={`${intelligence.volumeRatio.toFixed(1)}x`} tone={intelligence.volumeRatio >= 1.25 ? "text-emerald-300" : "text-slate-300"} />
        <DashboardGauge label={zh ? "模型准备" : "Model Ready"} value={modelReadiness} readout={analysisLinked ? "LINK" : "WAIT"} tone={analysisLinked ? "text-emerald-300" : "text-blue-300/70"} />
      </div>
      <div className="mt-2 rounded border border-blue-500/30 bg-[#031426]/58 px-2.5 py-2">
        <div className="flex items-center justify-between gap-2 text-[8px] font-black uppercase tracking-widest">
          <span className="text-slate-500">{zh ? "行情源" : "Feed"}</span>
          <span className="font-mono text-blue-300/70">{sourceLabel} · {marketState}</span>
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
      <div className="rounded border border-blue-500/30 bg-blue-500/20 px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
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
        <ModelParameter label={zh ? "模型链路" : "Runtime"} value={modeLabel} tone={analysisLinked ? "text-emerald-300" : "text-blue-300/70"} />
        <ModelParameter label={zh ? "样本窗口" : "Sample"} value={`${candleCount} K`} tone="text-slate-200" />
        <ModelParameter label={zh ? "证据载荷" : "Evidence"} value={`${evidenceLoad}%`} tone="text-emerald-300" />
        <ModelParameter label={zh ? "推理温度" : "Temp"} value="0.18" tone="text-blue-300/70" />
        <ModelParameter label={zh ? "可信阈值" : "Trust"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
        <ModelParameter label={zh ? "风险层" : "Risk"} value={brief.risk} tone={riskTone(intelligence.risk)} />
      </div>
      <div className="rounded border border-amber-400/15 bg-[#031426]/62 px-2.5 py-2 text-[9px] leading-relaxed text-slate-400">
        {zh
          ? `大模型参数只解释当前 ${sourceLabel} / ${marketState} 的趋势假设，不直接替代 DGWM 执行。`
          : `Model parameters explain the ${sourceLabel} / ${marketState} trend thesis without replacing DGWM execution.`}
      </div>
      <button
        onClick={onRunAnalysis}
        disabled={loading}
        className="mt-auto flex w-full items-center justify-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/20 px-3 py-2 text-[11px] font-black text-slate-200 transition-all hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5 fill-blue-100/80 stroke-none" />
        <span>{buttonLabel}</span>
      </button>
    </div>
  );
}

function DashboardGauge({ label, value, readout, tone }: { label: string; value: number; readout: string; tone: string }) {
  const width = Math.max(6, Math.min(100, value));
  return (
    <div className="min-w-0 rounded-md border border-[#12324a] bg-[#070b14]/82 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
        <div className={`font-mono text-[12px] font-black ${tone}`}>{readout}</div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#000814]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#3b6f91,#6f8fa8)] shadow-[0_0_14px_rgba(54,96,130,0.28)]"
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
    <div className="min-w-0 rounded border border-[#12324a] bg-[#031426]/72 px-2 py-2">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function StripMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-[#12324a] bg-[#031426]/72 px-2 py-2">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function DashboardStripTile({ label, value, sub, tone, children }: { label: string; value: string; sub: string; tone: string; children: ReactNode }) {
  return (
    <div className="flex min-w-[132px] flex-col justify-between border-l border-[#12324a] bg-[#000814]/92 p-3">
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
    <div className="h-1.5 overflow-hidden rounded-full bg-[#031426]">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#3b6f91,#6f8fa8)] shadow-[0_0_14px_rgba(54,96,130,0.28)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MiniBars({ values, tone }: { values: number[]; tone: "cyan" | "emerald" }) {
  const color = tone === "emerald" ? "bg-emerald-300" : "bg-blue-500/25";
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
      <polyline points={points} fill="none" stroke="#3b6f91" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="30" x2="100" y2="30" stroke="#12324a" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function MiniRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(#3b6f91 ${clamped * 3.6}deg, rgba(15,23,42,0.9) 0deg)` }}
      >
        <div className="grid h-5 w-5 place-items-center rounded-full bg-[#000814] text-[7px] font-black text-blue-200/75">{Math.round(clamped)}</div>
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
        <span className="h-6 w-6 rounded-full border-2 border-blue-500/30 border-t-transparent animate-spin block"></span>
        <Sparkles className="h-3.5 w-3.5 text-blue-300/75 absolute inset-0 m-auto animate-pulse" />
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
      <div className="bg-[#031426] p-3 border border-[#12324a] rounded-lg">
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
        <div key={card.label} className="border border-[#12324a] bg-[#031426]/88 rounded-md px-2.5 py-2 min-h-16">
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
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded border border-[#12324a] bg-[#031426]/72 p-2">
      <div className="font-mono text-[10px] font-black text-blue-300/70">{index}</div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-black text-slate-100">{title}</div>
        <div className="mt-0.5 truncate text-[8px] text-slate-500">{meta}</div>
      </div>
    </div>
  );
}

function DecisionMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded border border-[#12324a] bg-[#031426]/72 px-2.5 py-2">
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
  if (score >= 62) return "border-blue-500/30 bg-blue-500/[0.07] shadow-[0_0_28px_rgba(54,96,130,0.04)]";
  if (score <= 38) return "border-rose-400/25 bg-rose-500/[0.06] shadow-[0_0_28px_rgba(244,63,94,0.08)]";
  return "border-[#12324a] bg-[#031426]/82";
}

function scoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-blue-300/70";
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
