import { Activity, AlertTriangle, ChevronRight, Database, ListChecks, Newspaper, ShieldAlert, Sparkles, Target, Zap } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { buildPrismIntelligence, describePrismIntelligence, type PrismIntelligence } from "../../shared/src/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol, NewsItem } from "../../shared/src/types";
import type { Language } from "../../shared/src/translations";

type WorkspaceDeck = 1 | 2;

interface SignalScannerProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  onHandleHoverChange?: (active: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
  activeWorkspaceDeck?: WorkspaceDeck;
  integratedBottom?: boolean;
  revealHandle?: boolean;
}

interface IntelEvent {
  id: string;
  title: string;
  body: string;
  meta: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
  icon: ReactNode;
  symbol?: MarketSymbol;
}

interface StrategyLens {
  title: string;
  body: string;
  stage: string;
  score: number;
  direction: string;
  risk: string;
  execution: string;
  confidence: number;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
}

interface StrategySuggestion {
  id: string;
  title: string;
  body: string;
  meta: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
  stars: number;
  icon: ReactNode;
}

interface EvidenceItem {
  label: string;
  value: string;
  sub: string;
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
  width: number;
}
export default function SignalScanner({
  currentSymbol,
  symbolsList,
  marketStatus,
  analysisResult,
  lang,
  onSymbolSelect,
  onHandleHoverChange,
  onExpandedChange,
  activeWorkspaceDeck = 1,
  integratedBottom = false,
  revealHandle = false
}: SignalScannerProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const labels = getLabels(lang);

  useEffect(() => {
    setCollapsed(activeWorkspaceDeck !== 2);
  }, [activeWorkspaceDeck]);

  useEffect(() => {
    onExpandedChange?.(!collapsed);
  }, [collapsed, onExpandedChange]);

  useEffect(() => {
    const controller = new AbortController();
    setNewsLoading(true);
    fetch(`/api/news?symbol=${encodeURIComponent(currentSymbol.id)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ news: NewsItem[] }> : Promise.reject(new Error("News request failed")))
      .then((data) => {
        if (!controller.signal.aborted) setNewsItems(data.news.slice(0, 4));
      })
      .catch(() => {
        if (!controller.signal.aborted) setNewsItems([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setNewsLoading(false);
      });
    return () => controller.abort();
  }, [currentSymbol.id]);
  const events = useMemo(
    () => buildIntelEvents(symbolsList, currentSymbol, marketStatus, analysisResult, lang),
    [symbolsList, currentSymbol, marketStatus, analysisResult, lang]
  );
  const stats = useMemo(
    () => buildIntelStats(symbolsList, currentSymbol, marketStatus, analysisResult),
    [symbolsList, currentSymbol, marketStatus, analysisResult]
  );
  const strategy = useMemo(
    () => buildStrategyLens(currentSymbol, marketStatus, analysisResult, lang),
    [currentSymbol, marketStatus, analysisResult, lang]
  );
  const suggestions = useMemo(
    () => buildStrategySuggestions(currentSymbol, marketStatus, analysisResult, newsItems, lang),
    [currentSymbol, marketStatus, analysisResult, newsItems, lang]
  );
  const handleRevealTone = revealHandle || !collapsed
    ? "border-blue-500/30 bg-[#031426] text-blue-200/75 opacity-100 shadow-[0_0_34px_rgba(54,96,130,0.28)]"
    : "border-blue-500/30 bg-[#000814]/35 text-blue-300/70 opacity-25 shadow-none";
  const workspaceWidth = "clamp(900px, 46vw, 1180px)";

  return (
    <aside
      className="relative z-[70] hidden h-full shrink-0 overflow-visible xl:block"
      style={{
        width: collapsed ? 0 : workspaceWidth,
        transition: "width 520ms cubic-bezier(0.22, 1, 0.36, 1)"
      }}
    >
      <div
        className={`absolute inset-y-0 left-0 flex flex-col border-r border-[#12324a]/80 bg-[#000814] text-slate-200 shadow-[18px_0_44px_rgba(0,18,38,0.42)] transition-[transform,opacity,filter] duration-500 ${
          collapsed ? "pointer-events-none -translate-x-5 opacity-0 blur-[1px]" : "translate-x-0 opacity-100 blur-0"
        }`}
        style={{ width: workspaceWidth, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {integratedBottom ? (
          <TradingSignalsWarRoom
            currentSymbol={currentSymbol}
            strategy={strategy}
            events={events}
            stats={stats}
            suggestions={suggestions}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
          />
        ) : (
          <SingleAssetWarRoom
            currentSymbol={currentSymbol}
            strategy={strategy}
            events={events}
            stats={stats}
            suggestions={suggestions}
            newsItems={newsItems}
            newsLoading={newsLoading}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
            integratedBottom={integratedBottom}
            onSymbolSelect={onSymbolSelect}
          />
        )}
      </div>

      <button
        type="button"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setCollapsed((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          setCollapsed((value) => !value);
        }}
        onPointerEnter={() => onHandleHoverChange?.(true)}
        onPointerLeave={() => onHandleHoverChange?.(false)}
        onMouseEnter={() => onHandleHoverChange?.(true)}
        onMouseLeave={() => onHandleHoverChange?.(false)}
        onFocus={() => onHandleHoverChange?.(true)}
        onBlur={() => onHandleHoverChange?.(false)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? labels.expand : labels.collapse}
        className="pointer-events-auto absolute top-[2.75rem] z-[80] flex h-12 w-12 cursor-pointer items-center justify-center bg-transparent p-0 focus:outline-none"
        title={collapsed ? labels.expand : labels.collapse}
        style={{ left: collapsed ? 8 : `calc(${workspaceWidth} + 2px)` }}
      >
        <span
          className={`flex h-9 w-7 items-center justify-center rounded-md border backdrop-blur transition-[opacity,color,border-color,background-color,box-shadow,transform] delay-[80ms] duration-200 ${handleRevealTone}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-500 ${collapsed ? "rotate-0" : "rotate-180"}`}
            style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </span>
      </button>
    </aside>
  );
}

function TradingSignalsWarRoom({
  currentSymbol,
  strategy,
  events,
  stats,
  suggestions,
  marketStatus,
  analysisResult,
  lang
}: {
  currentSymbol: MarketSymbol;
  strategy: StrategyLens;
  events: IntelEvent[];
  stats: ReturnType<typeof buildIntelStats>;
  suggestions: StrategySuggestion[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const sourceLabel = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.lastSource || currentSymbol.exchange || "gateway";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "local";
  const volumeProxy = Math.max(1, currentSymbol.volume24h || currentSymbol.price * 100000);
  const shortInterest = clampSignalMetric(8 + Math.abs(intelligence.drawdownPct) * 0.9 + intelligence.volumeRatio * 6.5 + (100 - intelligence.confidencePct) * 0.08, 4, 42);
  const shortValue = currentSymbol.price * volumeProxy * Math.max(0.08, shortInterest / 100);
  const daysToCover = clampSignalMetric(0.65 + intelligence.volumeRatio * 0.7 + Math.abs(intelligence.momentumPct) * 0.08, 0.4, 8.8);
  const sharesOnLoan = volumeProxy * clampSignalMetric(0.18 + shortInterest / 95, 0.1, 0.72);
  const costToBorrow = clampSignalMetric(0.24 + Math.abs(intelligence.drawdownPct) * 0.04 + (100 - intelligence.score) * 0.012, 0.08, 8.4);
  const utilization = clampSignalMetric(22 + shortInterest * 1.35 + intelligence.volumeRatio * 5.8, 12, 96);
  const shortScore = clampSignalMetric(38 + shortInterest * 0.9 + (intelligence.risk === "stress" ? 14 : 0) + (intelligence.bias === "short" ? 8 : 0), 12, 100);
  const pressure = clampSignalMetric(50 + Math.abs(intelligence.drawdownPct) * 3.4 + intelligence.volumeRatio * 9 - intelligence.confidencePct * 0.16, 10, 96);
  const topCards = [
    { label: zh ? "空头占流通" : "Short % Float", value: `${shortInterest.toFixed(2)}%`, delta: `${formatSigned(currentSymbol.change24h)}%`, tone: "cyan" as const, seed: 1 },
    { label: zh ? "空头市值" : "Short Value", value: formatCompactStat(shortValue), delta: `${formatSigned(shortInterest - 12)}%`, tone: "cyan" as const, seed: 2 },
    { label: zh ? "回补天数" : "Days To Cover", value: `${daysToCover.toFixed(2)}d`, delta: `${formatSigned(daysToCover - 1.6)}`, tone: "amber" as const, seed: 3 },
    { label: zh ? "借出规模" : "Shares On Loan", value: formatCompactStat(sharesOnLoan), delta: `${formatSigned(intelligence.momentumPct)}%`, tone: "cyan" as const, seed: 4 },
    { label: zh ? "借券成本" : "Cost To Borrow", value: `${costToBorrow.toFixed(2)}%`, delta: `${formatSigned(costToBorrow - 0.6)}%`, tone: "rose" as const, seed: 5 },
    { label: zh ? "利用率" : "Utilization", value: `${utilization.toFixed(1)}%`, delta: `${formatSigned(utilization - 55)}%`, tone: "emerald" as const, seed: 6 },
    { label: zh ? "空头分" : "Short Score", value: `${shortScore.toFixed(0)}/100`, delta: `S${intelligence.score}`, tone: "cyan" as const, seed: 7 }
  ];
  const liveRows = [
    { label: zh ? "预估空头变化" : "Borrowed Change", value: formatCompactStat(sharesOnLoan * 0.034), tone: "text-blue-300/75" },
    { label: "CTB Avg", value: `${costToBorrow.toFixed(2)}%`, tone: costToBorrow > 2.5 ? "text-amber-300" : "text-slate-300" },
    { label: zh ? "压力区间" : "Pressure Range", value: `${Math.max(0, pressure - 18).toFixed(0)}-${pressure.toFixed(0)}`, tone: "text-rose-200" },
    { label: zh ? "数据状态" : "Feed State", value: feedState.toUpperCase(), tone: feedState === "live" ? "text-emerald-300" : "text-amber-300" }
  ];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#080605] text-slate-200" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), radial-gradient(circle at 60% 0%, rgba(47,91,91,0.14), transparent 36%)", backgroundSize: "28px 28px, 100% 100%" }}>
      <div className="border-b border-white/10 bg-[#0f1717] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.24em] text-teal-300/75">
              <Activity className="h-3.5 w-3.5" />
              II / Trading Signals
            </div>
            <div className="mt-1 truncate text-[15px] font-black text-white">{currentSymbol.name || currentSymbol.id}</div>
            <div className="mt-0.5 font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{currentSymbol.id} / {sourceLabel} / {feedState}</div>
          </div>
          <div className="text-right font-mono">
            <div className={`text-[18px] font-black ${warScoreTone(intelligence.score)}`}>{intelligence.score}</div>
            <div className="text-[7px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto no-scrollbar font-mono text-[7px] font-black uppercase tracking-[0.16em]">
          {["Overview", "Shorts", "Flow", "Signals", "Risk", "Events"].map((item, index) => (
            <span key={item} className={`shrink-0 border px-2 py-1 ${index === 1 ? "border-teal-300/40 bg-teal-300/10 text-teal-200" : "border-white/10 text-slate-500"}`}>{item}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 divide-x divide-white/10 border-b border-white/10 bg-[#120d0d]">
        {topCards.map((item) => <TradingMetricCard key={item.label} {...item} />)}
      </div>

      <div className="grid min-h-[430px] grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)] border-b border-white/10">
        <section className="min-w-0 border-r border-white/10 bg-[#090606] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">{zh ? "空头兴趣复合图" : "Short Interest Composite"}</div>
            <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">{brief.setup} / {strategy.stage}</div>
          </div>
          <div className="border border-white/10 bg-[#050504] p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]">
            <TradingCompositeChart shortPressure={shortInterest} utilization={utilization} score={shortScore} momentum={intelligence.momentumPct} />
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            <TradingLiveRow label={zh ? "价格表现" : "Price Perf"} value={`${formatSigned(currentSymbol.change24h)}%`} tone={currentSymbol.change24h >= 0 ? "text-emerald-300" : "text-rose-300"} />
            <TradingLiveRow label={zh ? "压力" : "Pressure"} value={pressure.toFixed(0)} tone={pressure > 68 ? "text-rose-300" : "text-amber-300"} />
            <TradingLiveRow label={zh ? "可信" : "Trust"} value={`${intelligence.confidencePct}%`} tone="text-teal-200" />
            <TradingLiveRow label="DGWM" value={analysisResult ? "LINK" : "WAIT"} tone={analysisResult ? "text-emerald-300" : "text-amber-300"} />
          </div>
        </section>

        <aside className="min-w-0 bg-[#0a0808]">
          <div className="border-b border-white/10 bg-[#10201f] px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-teal-200/80">
            {zh ? "实时空头数据" : "Live Short Interest Data"}
          </div>
          <div className="space-y-2 p-3">
            {liveRows.map((row) => <TradingLiveRow key={row.label} {...row} />)}
          </div>
          <div className="border-y border-white/10 bg-[#10201f] px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-slate-300">
            {zh ? "官方持仓变化" : "Official Short Interest Positions"}
          </div>
          <div className="p-3">
            <div className="border border-white/10 bg-[#050504] p-2">
              <WarRoomMiniDepth values={[shortInterest, utilization, shortScore, pressure, intelligence.confidencePct]} />
            </div>
          </div>
        </aside>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] divide-x divide-white/10">
        <WarRoomActionStack suggestions={suggestions} lang={lang} />
        <section className="bg-[#010b17]">
          <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
            <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
              <ListChecks className="h-3 w-3" />
              {zh ? "信号事件" : "Signal Events"}
            </div>
            <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{stats.feedIssues} FEED / {stats.defense} RISK</div>
          </div>
          <div className="divide-y divide-[#12324a]">
            {events.slice(0, 4).map((event) => (
              <div key={event.id} className="grid grid-cols-[minmax(0,1fr)_72px] gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-black text-slate-200">{event.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-[8px] text-slate-500">{event.body}</div>
                </div>
                <div className={`self-start border px-1.5 py-0.5 text-right font-mono text-[7px] font-black uppercase tracking-widest ${eventTagTone(event.tone)}`}>{event.meta}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function TradingMetricCard({ label, value, delta, tone, seed }: { label: string; value: string; delta: string; tone: "cyan" | "amber" | "rose" | "emerald"; seed: number }) {
  const toneClass = tone === "rose" ? "text-rose-300" : tone === "amber" ? "text-amber-300" : tone === "emerald" ? "text-emerald-300" : "text-teal-200";
  return (
    <div className="min-w-0 px-2 py-2">
      <div className="truncate text-center text-[8px] font-black text-slate-300">{label}</div>
      <div className={`mt-1 truncate text-center font-mono text-[12px] font-black ${toneClass}`}>{value}</div>
      <TradingSignalSpark seed={seed} tone={tone} />
      <div className={`mt-1 text-right font-mono text-[7px] font-black ${toneClass}`}>{delta}</div>
    </div>
  );
}

function TradingSignalSpark({ seed, tone }: { seed: number; tone: "cyan" | "amber" | "rose" | "emerald" }) {
  const stroke = tone === "rose" ? "#fb7185" : tone === "amber" ? "#facc15" : tone === "emerald" ? "#6ee7b7" : "#5eead4";
  const points = Array.from({ length: 12 }).map((_, index) => {
    const x = 4 + index * 8;
    const y = 27 - (Math.sin((index + seed) * 0.72) * 8 + Math.cos((index * seed) * 0.22) * 5 + 12);
    return `${x},${Math.max(6, Math.min(31, y))}`;
  }).join(" ");
  return (
    <svg className="mt-2 h-10 w-full" viewBox="0 0 96 38" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.7" vectorEffect="non-scaling-stroke" opacity="0.82" />
      <line x1="0" x2="96" y1="34" y2="34" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
    </svg>
  );
}

function TradingCompositeChart({ shortPressure, utilization, score, momentum }: { shortPressure: number; utilization: number; score: number; momentum: number }) {
  const orangePoints = [22, 30, 28, 34, 31, 38, 42, 36, 46, 49, 44, 52].map((value, index) => `${index * 8.5},${76 - value * 0.56}`).join(" ");
  const tealPoints = [score, utilization, shortPressure, 58 + momentum, score * 0.86, utilization * 0.78].map((value, index) => `${index * 19},${72 - Math.max(0, Math.min(100, value)) * 0.54}`).join(" ");
  return (
    <svg className="h-[300px] w-full" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="tradingOrangeFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.34" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[14, 28, 42, 56, 70].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="0.7" />)}
      {[18, 36, 54, 72, 90].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="78" stroke="rgba(94,234,212,0.08)" strokeWidth="0.7" />)}
      <polygon points={`0,78 ${orangePoints} 100,78`} fill="url(#tradingOrangeFill)" />
      <polyline points={orangePoints} fill="none" stroke="#fb923c" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.82" />
      <polyline points={tealPoints} fill="none" stroke="#5eead4" strokeWidth="1.8" vectorEffect="non-scaling-stroke" opacity="0.92" />
      <rect x="78" y="65" width="18" height="7" fill="rgba(99,102,241,0.36)" />
      <line x1="78" x2="96" y1="65" y2="65" stroke="#a5b4fc" strokeWidth="1" />
    </svg>
  );
}

function TradingLiveRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 border border-white/10 bg-[#070707] px-2 py-2">
      <div className="truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function clampSignalMetric(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
function SingleAssetWarRoom({
  currentSymbol,
  strategy,
  events,
  stats,
  suggestions,
  newsItems,
  newsLoading,
  marketStatus,
  analysisResult,
  lang,
  integratedBottom,
  onSymbolSelect
}: {
  currentSymbol: MarketSymbol;
  strategy: StrategyLens;
  events: IntelEvent[];
  stats: ReturnType<typeof buildIntelStats>;
  suggestions: StrategySuggestion[];
  newsItems: NewsItem[];
  newsLoading: boolean;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  integratedBottom: boolean;
  onSymbolSelect: (symbol: MarketSymbol) => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const sourceLabel = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.lastSource || currentSymbol.exchange || "gateway";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "local";
  const priceText = formatDeskPrice(currentSymbol.price, currentSymbol.precision);
  const deskTabs = ["FUNDAMENTALS", "EVENTS", "NEWS", "FLOW", "RISK", "DGWM", "SHORTS", "INSIDERS", "FEED"];
  const marketCapProxy = currentSymbol.type === "crypto" ? "CRYPTO" : (currentSymbol.exchange || currentSymbol.market || "EQUITY").toUpperCase();
  const thesisState = intelligence.score >= 68
    ? (zh ? "可推进" : "Advance")
    : intelligence.score >= 52
      ? (zh ? "等待确认" : "Wait Confirm")
      : (zh ? "降低优先级" : "De-prioritize");
  const thesisStateTone = intelligence.score >= 68
    ? "text-emerald-300"
    : intelligence.score >= 52
      ? "text-amber-300"
      : "text-rose-300";
  const confirmationText = zh
    ? `${intelligence.confidencePct}% 可信 / ${events.length} 事件`
    : `${intelligence.confidencePct}% trust / ${events.length} events`;
  const invalidationText = zh
    ? `${brief.risk} / ${formatSigned(intelligence.drawdownPct)}% 回撤`
    : `${brief.risk} / ${formatSigned(intelligence.drawdownPct)}% drawdown`;
  const thesisRows = [
    { label: zh ? "主判断" : "Primary Read", value: brief.bias, detail: brief.setup, tone: warBiasTone(intelligence.bias) },
    { label: zh ? "确认条件" : "Confirmation", value: confirmationText, detail: sourceLabel, tone: "text-emerald-300" },
    { label: zh ? "失效边界" : "Invalidation", value: invalidationText, detail: feedState, tone: warRiskTone(intelligence.risk) }
  ];

  return (
    <>
      <div className="border-b border-[#12324a] bg-[#000814]">
        <div className="flex h-8 items-center justify-between gap-3 overflow-hidden border-b border-[#12324a] bg-[#000814] px-2 pr-10">
          <div data-desk-tabs className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
            {deskTabs.map((item, index) => (
              <span
                key={item}
                className={`shrink-0 border-r border-[#0c253a] px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] ${index === 0 ? "bg-blue-500/25 text-blue-100/80 shadow-[inset_0_-2px_0_rgba(54,96,130,0.75)]" : "text-slate-500"}`}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="hidden shrink-0 items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 2xl:flex">
            <span className="text-blue-300/70">{currentSymbol.id}</span>
            <span>/</span>
            <span>{sourceLabel}</span>
            <span>/</span>
            <span>{feedState}</span>
            <span>/</span>
            <span className={warScoreTone(intelligence.score)}>MSIR {intelligence.score}</span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#000814]" style={{ backgroundImage: "linear-gradient(rgba(54,96,130,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(54,96,130,0.04) 1px, transparent 1px), radial-gradient(circle at 18% 0%, rgba(42,82,120,0.08), transparent 34%)", backgroundSize: "24px 24px, 24px 24px, 100% 100%" }}>
        <div className="grid min-h-full grid-rows-[270px_minmax(360px,1fr)]">
          <WarRoomFundamentalSnapshot
            currentSymbol={currentSymbol}
            intelligence={intelligence}
            brief={brief}
            sourceLabel={sourceLabel}
            feedState={feedState}
            marketCapProxy={marketCapProxy}
            priceText={priceText}
            thesisState={thesisState}
            thesisStateTone={thesisStateTone}
            lang={lang}
          />

          <div className="grid min-h-0 grid-cols-[minmax(0,1.02fr)_minmax(312px,0.82fr)]">
            <div className="min-w-0">
              <WarRoomNarrativeList
                newsItems={newsItems}
                loading={newsLoading}
                events={events}
                symbol={currentSymbol}
                lang={lang}
              />
              <StrategyEventTape events={events} lang={lang} onSymbolSelect={onSymbolSelect} />
            </div>

            <div className="min-w-0">
              <WarRoomOrderGraphPanel
                intelligence={intelligence}
                symbol={currentSymbol}
                sourceLabel={sourceLabel}
                feedState={feedState}
                lang={lang}
              />
              <WarRoomActionStack suggestions={suggestions} lang={lang} />
            </div>
          </div>
        </div>

        {!integratedBottom && (
          <EvidenceStrip
            currentSymbol={currentSymbol}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
          />
        )}
      </div>

      {!integratedBottom && (
        <div className="border-t border-[#12324a] bg-[#000814] p-2.5">
          <div className="border border-[#12324a] bg-[#061a2b] p-2 text-[9px] leading-relaxed text-slate-500">
            <div className="mb-1 font-mono font-black uppercase tracking-widest text-slate-400">
              {zh ? "作战室职责" : "War Room Role"}
            </div>
            {zh
              ? "作战室只处理当前标的：先形成假设，再压缩事件、风险、数据和 DGWM 门控。"
              : "The war room is scoped to the selected asset: thesis first, then events, risk, feed, and DGWM gates."}
          </div>
        </div>
      )}
    </>
  );
}


function WarRoomRightStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#12324a] px-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
        <span className="h-1.5 w-1.5 shrink-0 bg-blue-500/25" />
        {label}
      </div>
      <div className={`shrink-0 font-mono text-[18px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function WarRoomMemoCell({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <div className="relative min-w-0 border-r border-[#12324a] bg-[#031426] px-3 py-2 last:border-r-0">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500/25" />
      <div className="flex items-center gap-1.5 truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
        <span className="h-1.5 w-1.5 shrink-0 bg-amber-300/70" />
        {label}
      </div>
      <div className={`mt-1 truncate text-[11px] font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 truncate font-mono text-[7px] uppercase tracking-wider text-slate-600">{detail}</div>
    </div>
  );
}

function WarRoomRailStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-[#12324a] px-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-1.5 truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
        <span className="h-1.5 w-1.5 shrink-0 bg-slate-500" />
        {label}
      </div>
      <div className={`truncate text-right font-mono text-[11px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function WarRoomMetricCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="relative min-w-0 border-r border-[#12324a] bg-[#031426] px-2.5 py-2 last:border-r-0">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500/25" />
      <div className="truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[11px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function WarRoomBar({ label, value, tone, left, right }: { label: string; value: number; tone: "cyan" | "emerald" | "amber" | "rose"; left: string; right: string }) {
  const width = Math.max(4, Math.min(100, Math.round(value)));
  const fill = {
    cyan: "bg-blue-500/25",
    emerald: "bg-emerald-300",
    amber: "bg-amber-300",
    rose: "bg-rose-300"
  }[tone];

  return (
    <div>
      <div className="flex items-center justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
        <span>{label}</span>
        <span className="text-slate-400">{width}</span>
      </div>
      <div className="mt-1 h-1.5 bg-[#000814]">
        <div className={`h-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-700">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function WarRoomFundamentalSnapshot({
  currentSymbol,
  intelligence,
  brief,
  sourceLabel,
  feedState,
  marketCapProxy,
  priceText,
  thesisState,
  thesisStateTone,
  lang
}: {
  currentSymbol: MarketSymbol;
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  sourceLabel: string;
  feedState: string;
  marketCapProxy: string;
  priceText: string;
  thesisState: string;
  thesisStateTone: string;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const volatility = Math.max(0.7, intelligence.volatilityPct || Math.abs(currentSymbol.change24h) || 1.2);
  const daySpread = Math.min(8, Math.max(0.8, volatility * 0.72));
  const rangeSpread = Math.min(48, Math.max(14, Math.abs(intelligence.drawdownPct) * 1.6 + volatility * 4));
  const dayLow = currentSymbol.price * (1 - daySpread / 100);
  const dayHigh = currentSymbol.price * (1 + daySpread / 100);
  const rangeLow = currentSymbol.price * (1 - rangeSpread / 100);
  const rangeHigh = currentSymbol.price * (1 + rangeSpread / 100);
  const dayPosition = clampPercent(50 + currentSymbol.change24h * 8);
  const rangePosition = clampPercent(72 + intelligence.momentumPct * 5 - Math.abs(intelligence.drawdownPct));
  const volumeValue = currentSymbol.volume24h > 0 ? formatCompactStat(currentSymbol.volume24h) : `${intelligence.volumeRatio.toFixed(1)}x`;
  const capProxy = currentSymbol.price > 0
    ? `${formatCompactStat(currentSymbol.price * Math.max(currentSymbol.volume24h, 1_000_000))} ${currentSymbol.currency || "USD"}`
    : marketCapProxy;
  const freeFloat = `${Math.max(8, Math.min(97, Math.round(intelligence.confidencePct * 0.92)))}%`;
  const floatProxy = `${formatCompactStat(Math.max(50_000, currentSymbol.volume24h * 0.28 || 2_400_000))} ${currentSymbol.type === "crypto" ? "units" : "shrs"}`;
  const sharesProxy = `${formatCompactStat(Math.max(120_000, currentSymbol.volume24h * 0.74 || 8_800_000))} ${currentSymbol.type === "crypto" ? "units" : "shrs"}`;
  const narrative = zh
    ? [
      `${currentSymbol.name} 当前围绕 ${brief.setup} 展开，MSIR ${intelligence.score}，趋势判断为 ${brief.bias}。`,
      `成交量代理为 ${intelligence.volumeRatio.toFixed(1)}x，回撤压力 ${formatSigned(intelligence.drawdownPct)}%，先看价格是否继续守住关键流动性区域。`,
      `此模块对应参考图里的 Company Highlights：用于把基本面摘要、区间位置和右侧核心指标压到同一屏。`
    ]
    : [
      `${currentSymbol.name} is staged around ${brief.setup}; MSIR ${intelligence.score} and bias is ${brief.bias}.`,
      `Volume proxy reads ${intelligence.volumeRatio.toFixed(1)}x, drawdown pressure is ${formatSigned(intelligence.drawdownPct)}%, and liquidity confirmation remains the next check.`,
      `This mirrors the Company Highlights panel: thesis text, range position, and key stats in one work surface.`
    ];

  return (
    <section className="border-b border-[#12324a] bg-[#010915]">
      <div className="min-w-0">
        <div className="grid h-full grid-rows-[54px_minmax(0,1fr)_32px]">
          <div className="grid grid-cols-[minmax(0,1fr)_410px] border-b border-[#12324a] bg-[#020b18] px-3 py-1.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-mono text-[8px] font-black uppercase tracking-[0.24em] text-blue-300/70">
                <Target className="h-3 w-3" />
                {zh ? "基本面摘要 / 作战亮点" : "Company Highlights / Thesis"}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <span className="truncate text-[18px] font-black leading-none text-slate-100">{currentSymbol.id}</span>
                <span className="border border-[#1d4d6d] bg-[#031426] px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-wider text-slate-400">{marketCapProxy}</span>
                <span className={`font-mono text-[10px] font-black ${currentSymbol.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatSigned(currentSymbol.change24h)}%</span>
              </div>
            </div>
            <div className="flex min-w-0 items-center self-stretch">
              <WarRoomRangeGradient
                dayLeft={formatDeskPrice(dayLow, currentSymbol.precision)}
                dayRight={formatDeskPrice(dayHigh, currentSymbol.precision)}
                dayValue={dayPosition}
                rangeLeft={formatDeskPrice(rangeLow, currentSymbol.precision)}
                rangeRight={formatDeskPrice(rangeHigh, currentSymbol.precision)}
                rangeValue={rangePosition}
              />
            </div>
          </div>

          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_150px]">
            <div className="flex h-full min-h-0 min-w-0 flex-col justify-between p-3">
              <div className="space-y-2 text-[9px] font-semibold leading-relaxed text-slate-300">
                {narrative.map((line) => <p key={line} className="line-clamp-2">{line}</p>)}
              </div>
              <div className="grid grid-cols-4 border border-[#12324a] bg-[#031426]/72">
                <WarRoomMetricCell label={zh ? "价格" : "Price"} value={priceText} tone="text-slate-100" />
                <WarRoomMetricCell label={zh ? "状态" : "State"} value={thesisState} tone={thesisStateTone} />
                <WarRoomMetricCell label={zh ? "可信" : "Trust"} value={`${intelligence.confidencePct}%`} tone="text-emerald-300" />
                <WarRoomMetricCell label="DGWM" value={intelligence.score >= 62 ? "READY" : "WAIT"} tone={intelligence.score >= 62 ? "text-blue-300/70" : "text-amber-300"} />
              </div>
            </div>
            <div className="border-l border-[#12324a] bg-[#010d1c] p-2">
              <WarRoomKeyStatsRail
                stats={[
                  { label: zh ? "市值代理" : "Market Cap", value: capProxy },
                  { label: zh ? "成交量" : "Volume", value: volumeValue },
                  { label: zh ? "流通供给" : "Shares Out", value: sharesProxy },
                  { label: zh ? "自由流通" : "Free Float", value: `${floatProxy} / ${freeFloat}` }
                ]}
              />
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 overflow-hidden border-t border-[#12324a] bg-[#031827] px-3 font-mono text-[7px] font-black uppercase tracking-[0.18em] text-slate-500">
            <span className="text-blue-300/70">{sourceLabel}</span>
            <span>/</span>
            <span>{feedState}</span>
            <span>/</span>
            <span>{brief.risk}</span>
            <span>/</span>
            <span className="truncate">{currentSymbol.name}</span>
          </div>
        </div>
      </div>

    </section>
  );
}

function WarRoomRangeGradient({
  dayLeft,
  dayRight,
  dayValue,
  rangeLeft,
  rangeRight,
  rangeValue
}: {
  dayLeft: string;
  dayRight: string;
  dayValue: number;
  rangeLeft: string;
  rangeRight: string;
  rangeValue: number;
}) {
  return (
    <div className="war-range-pair grid w-full min-w-0 grid-cols-2 items-center gap-5 font-mono text-[7px] font-black uppercase tracking-wider text-slate-500">
      <RangeGradientRow label="DAY" left={dayLeft} right={dayRight} value={dayValue} markerTone="white" />
      <RangeGradientRow label="52 WEEK" left={rangeLeft} right={rangeRight} value={rangeValue} markerTone="cyan" />
    </div>
  );
}

function RangeGradientRow({ label, left, right, value, markerTone }: { label: string; left: string; right: string; value: number; markerTone: "white" | "cyan" }) {
  const clamped = clampPercent(value);
  const markerClass = markerTone === "cyan"
    ? "bg-blue-200/70 shadow-[0_0_10px_rgba(54,96,130,0.52)]"
    : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]";
  return (
    <div className="war-range-row min-w-0">
      <div className="war-range-meta grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[6px] tracking-[0.12em] text-slate-500">
        <span className="truncate text-left">{left}</span>
        <span className="shrink-0 text-center text-[7px] tracking-[0.14em] text-slate-300">{label}</span>
        <span className="truncate text-right">{right}</span>
      </div>
      <div className="war-range-track relative mt-1 h-2 bg-[#000814] shadow-[inset_0_0_0_1px_rgba(18,50,74,0.82)]">
        <div
          className="war-range-fill absolute inset-0"
          style={{
            background: "linear-gradient(90deg, rgba(251,113,133,0.9) 0%, rgba(210,116,128,0.76) 25%, rgba(60,65,73,0.78) 48%, rgba(44,196,207,0.82) 72%, rgba(93,245,237,0.94) 100%)"
          }}
        />
        <div className="war-range-topline absolute inset-x-0 top-0 h-px bg-white/18" />
        <div className="war-range-bottomline absolute inset-x-0 bottom-0 h-px bg-black/55" />
        <div className={`war-range-marker absolute -top-1 h-4 w-[2px] ${markerClass}`} style={{ left: `${clamped}%` }} />
      </div>
    </div>
  );
}
function WarRoomKeyStatsRail({ stats }: { stats: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid h-full content-center gap-2">
      {stats.map((item) => (
        <div key={item.label} className="text-center font-mono">
          <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">{item.label}</div>
          <div className="mx-auto mt-1 w-fit max-w-full truncate border border-slate-500/70 bg-[#05080d] px-2 py-0.5 text-[9px] font-black text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function WarRoomNarrativeList({ newsItems, loading, events, symbol, lang }: { newsItems: NewsItem[]; loading: boolean; events: IntelEvent[]; symbol: MarketSymbol; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";
  const newsRows = newsItems.slice(0, 5).map((item, index) => ({
    id: item.id,
    title: item.title,
    meta: `${item.source} / ${item.time}`,
    tag: item.sentiment === "neutral" ? "MT Narrative" : item.sentiment.toUpperCase(),
    tone: item.sentiment === "bearish" ? "rose" : item.sentiment === "bullish" ? "emerald" : "amber" as IntelEvent["tone"],
    stars: catalystStarScore(item, index, symbol.change24h)
  }));
  const fallbackRows = events.slice(0, 5).map((item, index) => ({
    id: item.id,
    title: item.title,
    meta: item.meta,
    tag: item.tone === "amber" ? (zh ? "为什么重要" : "Why It Matters") : "MT Narrative",
    tone: item.tone,
    stars: Math.max(3, Math.min(5, item.tone === "slate" ? 3 : 4 + (index === 0 ? 1 : 0)))
  }));
  const rows = (newsRows.length > 0 ? newsRows : fallbackRows).slice(0, 5);
  while (rows.length < 5) {
    rows.push({ id: `placeholder-${rows.length}`, title: loading ? (zh ? "正在同步事件叙事" : "Syncing market narrative") : (zh ? "等待新的材料事件" : "Awaiting material event"), meta: "PRISM SENTINEL", tag: "MT Narrative", tone: "amber", stars: 3 });
  }

  return (
    <section className="border-b border-[#12324a] bg-[#010915]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-amber-300">
          <Newspaper className="h-3 w-3" />
          {zh ? "叙事新闻 / 事件评分" : "Narrative News / Event Ratings"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">MT NARRATIVE</div>
      </div>
      <div className="divide-y divide-[#12324a]">
        {rows.map((item) => (
          <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_132px] items-center gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-black text-slate-200">{item.title}</div>
              <div className="mt-0.5 truncate font-mono text-[7px] uppercase tracking-wider text-slate-600">{item.meta}</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <span className={`shrink-0 border px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-wider ${eventTagTone(item.tone)}`}>{item.tag}</span>
              <span className="font-mono text-[9px] tracking-[0.08em]">
                {Array.from({ length: 5 }).map((_, index) => <span key={index} className={index < item.stars ? "text-amber-300" : "text-slate-700"}>★</span>)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WarRoomOrderGraphPanel({ intelligence, symbol, sourceLabel, feedState, lang }: { intelligence: PrismIntelligence; symbol: MarketSymbol; sourceLabel: string; feedState: string; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";
  const depth = buildDepthValues(intelligence, symbol);
  const spread = Math.max(0.03, Math.min(2.8, intelligence.volatilityPct * 0.18 + Math.abs(symbol.change24h) * 0.05));

  return (
    <section className="border-b border-[#12324a] bg-[#010915]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
          <Activity className="h-3 w-3" />
          {zh ? "订单压力 / 深度图" : "Order Pressure / Depth"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{sourceLabel} / {feedState}</div>
      </div>
      <div className="border-b border-[#12324a] bg-[#020b18] px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 font-mono text-[8px] font-black uppercase tracking-wider">
            <span className="border border-blue-500/30 bg-blue-500/25 px-2 py-1 text-blue-200/75">ORDER GRAPH</span>
            <span className="border border-[#12324a] bg-[#000814] px-2 py-1 text-slate-500">ORDER BOOK</span>
          </div>
          <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">{symbol.id} / {zh ? "代理深度" : "proxy depth"}</div>
        </div>
      </div>
      <div className="p-3">
        <div className="overflow-hidden border border-[#12324a] bg-[#05080d] shadow-[inset_0_0_0_1px_rgba(54,96,130,0.035),0_18px_36px_rgba(0,0,0,0.22)]">
          <WarRoomStepDepthChart bids={depth.bids} asks={depth.asks} />
        </div>
        <div className="mt-3 grid grid-cols-3 border border-[#12324a]">
          <WarRoomMetricCell label={zh ? "中间价" : "Mid"} value={formatDeskPrice(symbol.price, symbol.precision)} tone="text-blue-300/70" />
          <WarRoomMetricCell label={zh ? "价差" : "Spread"} value={`${spread.toFixed(2)}%`} tone={spread > 1.2 ? "text-amber-300" : "text-emerald-300"} />
          <WarRoomMetricCell label={zh ? "深度" : "Depth"} value={depth.bias} tone={depth.bias === "BID HEAVY" ? "text-blue-300/70" : depth.bias === "ASK HEAVY" ? "text-rose-300" : "text-slate-300"} />
        </div>
      </div>
    </section>
  );
}

function WarRoomStepDepthChart({ bids, asks }: { bids: number[]; asks: number[] }) {
  const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const bidPower = Math.max(48, Math.min(96, average(bids)));
  const askPower = Math.max(8, Math.min(82, average(asks)));
  const bidLift = (bidPower - 68) * 0.22;
  const askLift = (askPower - 34) * 0.18;
  const baseline = 218;
  const bidTop = 70 - bidLift;
  const bidShelfA = 109 - bidLift * 0.45;
  const bidShelfB = 151 - bidLift * 0.2;
  const bidCliff = 207 - bidLift * 0.08;
  const askStart = 216 - askLift * 0.12;
  const askShelf = 204 - askLift * 0.35;
  const askRamp = 181 - askLift * 0.62;
  const askTop = 136 - askLift;
  const bidLine = buildSmoothDepthPath([
    [58, bidTop],
    [104, bidTop + 3],
    [132, bidShelfA],
    [185, bidShelfA + 9],
    [216, bidShelfB],
    [262, bidShelfB + 10],
    [294, bidCliff],
    [330, baseline - 3],
    [368, baseline]
  ]);
  const bidArea = `${bidLine} L 368 ${baseline} L 58 ${baseline} Z`;
  const askLine = buildSmoothDepthPath([
    [368, baseline],
    [452, askStart],
    [512, askShelf],
    [584, askRamp],
    [620, askTop]
  ]);
  const askArea = `${askLine} L 620 ${baseline} L 368 ${baseline} Z`;

  return (
    <svg className="war-room-depth-chart h-[220px] w-full" viewBox="0 0 640 260" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="ortexDepthSurface" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--depth-surface-0, #0a1518)" />
          <stop offset="0.48" stopColor="var(--depth-surface-mid, #070708)" />
          <stop offset="1" stopColor="var(--depth-surface-1, #100a0a)" />
        </linearGradient>
        <radialGradient id="ortexDepthMist" cx="50%" cy="44%" r="72%">
          <stop offset="0" stopColor="var(--depth-mist-0, #11343a)" stopOpacity="var(--depth-mist-opacity-0, 0.2)" />
          <stop offset="0.55" stopColor="var(--depth-mist-1, #071013)" stopOpacity="var(--depth-mist-opacity-1, 0.12)" />
          <stop offset="1" stopColor="var(--depth-mist-2, #000000)" stopOpacity="var(--depth-mist-opacity-2, 0)" />
        </radialGradient>
        <linearGradient id="ortexDepthBaseline" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--depth-baseline-bid, #38f5ee)" stopOpacity="var(--depth-baseline-opacity, 0.55)" />
          <stop offset="0.48" stopColor="var(--depth-baseline-mid-bid, #20434a)" stopOpacity="var(--depth-baseline-opacity, 0.55)" />
          <stop offset="0.62" stopColor="var(--depth-baseline-mid-ask, #552020)" stopOpacity="var(--depth-baseline-opacity-soft, 0.45)" />
          <stop offset="1" stopColor="var(--depth-baseline-ask, #ff6658)" stopOpacity="var(--depth-baseline-opacity, 0.55)" />
        </linearGradient>
        <linearGradient id="ortexBidDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--depth-bid-fill-0, #45fff6)" stopOpacity="var(--depth-bid-fill-opacity-0, 0.88)" />
          <stop offset="0.48" stopColor="var(--depth-bid-fill-1, #20bdc0)" stopOpacity="var(--depth-bid-fill-opacity-1, 0.58)" />
          <stop offset="0.78" stopColor="var(--depth-bid-fill-2, #12656d)" stopOpacity="var(--depth-bid-fill-opacity-2, 0.34)" />
          <stop offset="1" stopColor="var(--depth-bid-fill-3, #0a2023)" stopOpacity="var(--depth-bid-fill-opacity-3, 0.2)" />
        </linearGradient>
        <linearGradient id="ortexAskDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--depth-ask-fill-0, #ff796e)" stopOpacity="var(--depth-ask-fill-opacity-0, 0.86)" />
          <stop offset="0.54" stopColor="var(--depth-ask-fill-1, #cf4a43)" stopOpacity="var(--depth-ask-fill-opacity-1, 0.52)" />
          <stop offset="0.82" stopColor="var(--depth-ask-fill-2, #6d2522)" stopOpacity="var(--depth-ask-fill-opacity-2, 0.34)" />
          <stop offset="1" stopColor="var(--depth-ask-fill-3, #271010)" stopOpacity="var(--depth-ask-fill-opacity-3, 0.2)" />
        </linearGradient>
        <filter id="ortexDepthGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="ortexDepthSoftEdge" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.15" />
        </filter>
      </defs>
      <rect x="0" y="0" width="640" height="260" fill="url(#ortexDepthSurface)" />
      <rect x="0" y="0" width="640" height="260" fill="url(#ortexDepthMist)" />
      {[52, 92, 132, 172, 212].map((y) => <line key={y} x1="52" x2="622" y1={y} y2={y} stroke="var(--depth-grid-y, #3a302e)" strokeWidth="0.8" strokeOpacity="var(--depth-grid-opacity, 0.42)" />)}
      {[88, 208, 328, 448, 568].map((x) => <line key={x} x1={x} x2={x} y1="36" y2="232" stroke="var(--depth-grid-x, #263942)" strokeWidth="0.8" strokeOpacity="var(--depth-grid-opacity, 0.42)" />)}
      {["12.5", "10.0", "7.5", "5.0", "2.5", "0"].map((label, index) => (
        <text key={label} x="18" y={54 + index * 34} fill="var(--depth-axis-text, #4a3a38)" opacity="var(--depth-axis-opacity, 0.58)" fontSize="10" fontFamily="monospace" fontWeight="700">{label}</text>
      ))}
      <path d={bidArea} className="depth-glow" fill="var(--depth-bid-haze, #37f7ef)" opacity="var(--depth-bid-haze-opacity, 0.22)" filter="url(#ortexDepthGlow)" />
      <path d={askArea} className="depth-glow" fill="var(--depth-ask-haze, #ff675b)" opacity="var(--depth-ask-haze-opacity, 0.2)" filter="url(#ortexDepthGlow)" />
      <path d={bidArea} fill="url(#ortexBidDepthFill)" />
      <path d={askArea} fill="url(#ortexAskDepthFill)" />
      <path d={bidLine} fill="none" className="depth-soft-edge" stroke="var(--depth-bid-soft-edge, #b6fff9)" strokeWidth="5.5" strokeOpacity="var(--depth-soft-edge-opacity, 0.13)" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#ortexDepthSoftEdge)" />
      <path d={askLine} fill="none" className="depth-soft-edge" stroke="var(--depth-ask-soft-edge, #ffd2cc)" strokeWidth="5.5" strokeOpacity="var(--depth-soft-edge-opacity, 0.12)" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" filter="url(#ortexDepthSoftEdge)" />
      <path d={bidLine} fill="none" stroke="var(--depth-bid-line, #4cf8ef)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <path d={askLine} fill="none" stroke="var(--depth-ask-line, #ff7468)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <line x1="54" x2="620" y1={baseline} y2={baseline} stroke="url(#ortexDepthBaseline)" strokeWidth="2" />
      <line x1="366" x2="366" y1="42" y2="226" stroke="var(--depth-center-line, #1d5360)" strokeWidth="0.9" strokeDasharray="4 6" strokeOpacity="var(--depth-center-opacity, 0.72)" />
      {["17.1", "17.4", "17.7", "18.0", "18.3"].map((label, index) => (
        <text key={label} x={78 + index * 124} y="246" fill="var(--depth-axis-text, #3c3835)" opacity="var(--depth-axis-opacity-strong, 0.68)" fontSize="10" fontFamily="monospace" fontWeight="700">{label}</text>
      ))}
      <rect x="0" y="0" width="640" height="260" fill="none" stroke="var(--depth-frame, #12324a)" strokeOpacity="var(--depth-frame-opacity, 0.45)" />
    </svg>
  );
}
function buildSmoothDepthPath(points: Array<[number, number]>) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  const tension = 0.28;
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const nextAfter = points[Math.min(points.length - 1, index + 2)];
    const cp1x = current[0] + (next[0] - previous[0]) * tension;
    const cp1y = current[1] + (next[1] - previous[1]) * tension;
    const cp2x = next[0] - (nextAfter[0] - current[0]) * tension;
    const cp2y = next[1] - (nextAfter[1] - current[1]) * tension;
    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${next[0]} ${next[1]}`;
  }
  return path;
}
function buildDepthValues(intelligence: PrismIntelligence, symbol: MarketSymbol) {
  const momentum = Math.max(-8, Math.min(8, intelligence.momentumPct));
  const volumeBoost = Math.max(0, Math.min(18, (intelligence.volumeRatio - 1) * 12));
  const stress = Math.max(0, Math.min(22, Math.abs(intelligence.drawdownPct) * 1.5));
  const bidBase = 74 + momentum * 2 + volumeBoost - stress * 0.4;
  const askBase = 28 - momentum * 1.4 + stress + (symbol.change24h < 0 ? 12 : 0);
  const bids = [bidBase + 18, bidBase + 8, bidBase - 5, bidBase - 28, bidBase - 58].map(clampPercent);
  const asks = [askBase - 22, askBase - 12, askBase, askBase + 16, askBase + 34, askBase + 48].map(clampPercent);
  const bidSum = bids.reduce((sum, value) => sum + value, 0);
  const askSum = asks.reduce((sum, value) => sum + value, 0);
  const bias = bidSum > askSum * 1.18 ? "BID HEAVY" : askSum > bidSum * 1.18 ? "ASK HEAVY" : "BALANCED";
  return { bids, asks, bias };
}

function buildStepAreaPath(values: number[], x0: number, x1: number, baseline: number, maxHeight: number) {
  const step = (x1 - x0) / values.length;
  let path = `M ${x0} ${baseline}`;
  values.forEach((value, index) => {
    const x = x0 + index * step;
    const nextX = x0 + (index + 1) * step;
    const y = baseline - (clampPercent(value) / 100) * maxHeight;
    path += ` L ${x} ${y} L ${nextX} ${y}`;
  });
  return `${path} L ${x1} ${baseline} Z`;
}

function buildStepLinePath(values: number[], x0: number, x1: number, baseline: number, maxHeight: number) {
  const step = (x1 - x0) / values.length;
  let path = "";
  values.forEach((value, index) => {
    const x = x0 + index * step;
    const nextX = x0 + (index + 1) * step;
    const y = baseline - (clampPercent(value) / 100) * maxHeight;
    path += `${index === 0 ? "M" : "L"} ${x} ${y} L ${nextX} ${y} `;
  });
  return path.trim();
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(4, Math.min(96, value));
}
function WarRoomNewsPanel({ newsItems, loading, symbol, lang }: { newsItems: NewsItem[]; loading: boolean; symbol: MarketSymbol; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";
  const rows = newsItems.slice(0, 5);
  const impact = Math.max(42, Math.min(91, 52 + rows.length * 8 + Math.abs(symbol.change24h || 0) * 3)).toFixed(0);

  return (
    <section className="border-b border-[#12324a] bg-[#010915]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-amber-300">
          <Newspaper className="h-3 w-3" />
          {zh ? "事件 / 材料新闻" : "Events / Material News"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">IMPACT {impact}</div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_84px] border-b border-[#12324a]">
        <div className="min-w-0 p-3">
          <div className="font-mono text-[7px] font-black uppercase tracking-[0.18em] text-slate-500">
            PRISM MARKET PULSE / {symbol.id}
          </div>
          <div className="mt-2 line-clamp-2 text-[12px] font-black leading-snug text-slate-100">
            {rows[0]?.title || (loading ? (zh ? "正在读取事件流" : "Reading event stream") : `${symbol.id} ${zh ? "暂无强事件" : "has no major event"}`)}
          </div>
          <div className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-slate-500">
            {rows[0]?.summary || (zh ? "当前先按价格结构和量化参数处理。" : "Proceed using price structure and quant parameters until a stronger catalyst appears.")}
          </div>
        </div>
        <div className="border-l border-blue-500/30 bg-[#031426] p-2 text-right">
          <div className="font-mono text-[7px] font-black uppercase tracking-widest text-amber-300">SCORE</div>
          <div className="mt-2 font-mono text-[28px] font-black leading-none text-emerald-300">{impact}</div>
          <div className="mt-3 space-y-1 font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">
            <div>{zh ? "事件" : "Events"} {rows.length}</div>
            <div>{symbol.change24h >= 0 ? "BULLISH" : "BEARISH"}</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#12324a]">
        {(rows.length > 0 ? rows : [null, null, null, null]).map((item, index) => (
          <div key={item?.id || `empty-${index}`} className="grid grid-cols-[minmax(0,1fr)_86px] gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[9px] font-bold text-slate-300">
                {item?.title || (loading ? "Loading catalyst row" : "Awaiting verified catalyst")}
              </div>
              <div className="mt-0.5 truncate font-mono text-[7px] uppercase tracking-wider text-slate-600">
                {item ? `${item.source} / ${item.time}` : "PRISM MARKET PULSE"}
              </div>
            </div>
            <div className="text-right font-mono text-[7px] font-black uppercase tracking-widest">
              <span className={`border px-1.5 py-0.5 ${item ? eventTagTone(item.sentiment === "bearish" ? "rose" : item.sentiment === "bullish" ? "emerald" : "amber") : "border-slate-700 text-slate-500"}`}>
                {item?.sentiment || "SCAN"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WarRoomPressurePanel({
  intelligence,
  brief,
  sourceLabel,
  feedState,
  analysisLinked,
  lang
}: {
  intelligence: PrismIntelligence;
  brief: ReturnType<typeof describePrismIntelligence>;
  sourceLabel: string;
  feedState: string;
  analysisLinked: boolean;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const shortPressure = Math.min(100, Math.max(8, Math.abs(intelligence.drawdownPct) * 5.8));
  const volumePressure = Math.min(100, Math.max(8, intelligence.volumeRatio * 46));
  const trendPressure = Math.min(100, Math.max(8, 50 + intelligence.momentumPct * 7));
  const modelPressure = analysisLinked ? 88 : 46;

  return (
    <section className="border-b border-[#12324a] bg-[#010915]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
          <Activity className="h-3 w-3" />
          {zh ? "压力图" : "Pressure Graph"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{sourceLabel} / {feedState}</div>
      </div>
      <div className="p-3">
        <div className="border border-[#12324a] bg-[#031426] p-2">
          <WarRoomMiniDepth values={[trendPressure, volumePressure, intelligence.confidencePct, shortPressure, modelPressure]} />
        </div>
        <div className="mt-3 grid grid-cols-3 border border-[#12324a]">
          <WarRoomMetricCell label={zh ? "结构" : "Setup"} value={brief.setup} tone="text-blue-300/70" />
          <WarRoomMetricCell label={zh ? "风险" : "Risk"} value={brief.risk} tone={warRiskTone(intelligence.risk)} />
          <WarRoomMetricCell label="DGWM" value={analysisLinked ? "LINK" : "WAIT"} tone={analysisLinked ? "text-emerald-300" : "text-amber-300"} />
        </div>
      </div>
      <div className="space-y-2 border-t border-[#12324a] p-3">
        <WarRoomBar label={zh ? "趋势压力" : "Trend Pressure"} value={trendPressure} tone="cyan" left="LOW" right="BREAK" />
        <WarRoomBar label={zh ? "回撤压力" : "Drawdown Pressure"} value={shortPressure} tone={shortPressure > 62 ? "rose" : "amber"} left="CALM" right="STRESS" />
      </div>
    </section>
  );
}

function WarRoomMiniDepth({ values }: { values: number[] }) {
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = 72 - (Math.max(0, Math.min(100, value)) / 100) * 58;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,72 ${points} 100,72`;

  return (
    <svg className="h-40 w-full" viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="warRoomDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b6f91" stopOpacity="0.62" />
          <stop offset="1" stopColor="#3b6f91" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[14, 28, 42, 56, 70].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#22506d" strokeWidth="0.7" />)}
      {[20, 40, 60, 80].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="76" stroke="#12324a" strokeWidth="0.7" />)}
      <polygon points={area} fill="url(#warRoomDepthFill)" />
      <polyline points={points} fill="none" stroke="#3b6f91" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="72" y2="72" stroke="#2a668a" strokeWidth="1" />
    </svg>
  );
}

function WarRoomActionStack({ suggestions, lang }: { suggestions: StrategySuggestion[]; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";

  return (
    <section className="bg-[#010b17]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
          <ListChecks className="h-3 w-3" />
          {zh ? "执行门控" : "Execution Gates"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">DGWM GATE</div>
      </div>
      <div className="divide-y divide-[#12324a]">
        {suggestions.slice(0, 5).map((item, index) => (
          <div key={item.id} className="grid grid-cols-[34px_minmax(0,1fr)_62px] gap-2 px-3 py-2">
            <div className="font-mono text-[9px] font-black text-blue-300/70">{String(index + 1).padStart(2, "0")}</div>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-black text-slate-200">{item.title}</div>
              <div className="mt-0.5 line-clamp-1 text-[8px] text-slate-500">{item.body}</div>
            </div>
            <div className={`self-start border px-1 py-0.5 text-right font-mono text-[7px] font-black uppercase tracking-widest ${eventTagTone(item.tone)}`}>
              {item.meta}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatCompactStat(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "--";
  const units = [
    { suffix: "T", divisor: 1_000_000_000_000 },
    { suffix: "B", divisor: 1_000_000_000 },
    { suffix: "M", divisor: 1_000_000 },
    { suffix: "K", divisor: 1_000 }
  ];
  const unit = units.find((item) => value >= item.divisor);
  if (!unit) return value.toFixed(value >= 100 ? 0 : 1);
  const scaled = value / unit.divisor;
  return `${scaled >= 100 ? scaled.toFixed(0) : scaled.toFixed(1)}${unit.suffix}`;
}
function formatDeskPrice(price: number, precision: number) {
  if (!Number.isFinite(price) || price <= 0) return "--";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(precision, 2),
    maximumFractionDigits: Math.min(Math.max(precision, 2), 6)
  });
}

function warScoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-blue-300/70";
  if (score <= 38) return "text-rose-300";
  return "text-slate-300";
}

function warBiasTone(bias: PrismIntelligence["bias"]) {
  if (bias === "long") return "text-emerald-300";
  if (bias === "short") return "text-rose-300";
  if (bias === "defense") return "text-amber-300";
  return "text-slate-300";
}

function warRiskTone(risk: PrismIntelligence["risk"]) {
  if (risk === "normal") return "text-emerald-300";
  if (risk === "elevated") return "text-amber-300";
  if (risk === "stress") return "text-rose-300";
  return "text-orange-300";
}
function StrategyEventTape({ events, lang, onSymbolSelect }: { events: IntelEvent[]; lang: Language; onSymbolSelect: (symbol: MarketSymbol) => void }) {
  const zh = lang === "zh" || lang === "tc";

  return (
    <section className="bg-[#010b17]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
          <Activity className="h-3 w-3" />
          {zh ? "事件流" : "Event Tape"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">
          {zh ? "原因链" : "Cause Chain"}
        </div>
      </div>
      <div className="divide-y divide-[#12324a]">
        {events.slice(0, 5).map((event, index) => (
          <button
            key={event.id}
            type="button"
            onClick={() => event.symbol && onSymbolSelect(event.symbol)}
            disabled={!event.symbol}
            className="group grid w-full grid-cols-[28px_minmax(0,1fr)_76px] gap-2 px-3 py-2 text-left transition-colors hover:bg-[#061a2b] disabled:cursor-default"
          >
            <div className="font-mono text-[9px] font-black text-blue-300/70">{String(index + 1).padStart(2, "0")}</div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className={`shrink-0 ${eventIconTone(event.tone)}`}>{event.icon}</div>
                <div className="truncate text-[10px] font-black text-slate-200">{event.title}</div>
              </div>
              <div className="mt-1 line-clamp-1 text-[8px] leading-relaxed text-slate-500 group-hover:text-slate-400">{event.body}</div>
            </div>
            <div className={`self-start border px-1.5 py-0.5 text-right font-mono text-[7px] font-black uppercase tracking-wider ${eventTagTone(event.tone)}`}>
              {event.meta}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
function EvidenceStrip({
  currentSymbol,
  marketStatus,
  analysisResult,
  lang
}: {
  currentSymbol: MarketSymbol;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
}) {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const dataSource = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.lastSource || "gateway";
  const items: EvidenceItem[] = [
    {
      label: zh ? "评分" : "Score",
      value: String(intelligence.score),
      sub: brief.setup,
      tone: intelligence.score >= 68 ? "cyan" : intelligence.score >= 55 ? "slate" : "amber",
      width: intelligence.score
    },
    {
      label: zh ? "20K 动量" : "20K Momentum",
      value: `${formatSigned(intelligence.momentumPct)}%`,
      sub: brief.bias,
      tone: intelligence.momentumPct >= 0 ? "emerald" : "rose",
      width: Math.min(100, Math.max(8, Math.abs(intelligence.momentumPct) * 12))
    },
    {
      label: zh ? "成交量" : "Volume",
      value: `${intelligence.volumeRatio.toFixed(1)}x`,
      sub: intelligence.volumeRatio >= 1.4 ? (zh ? "放量" : "Expansion") : (zh ? "常态" : "Normal"),
      tone: intelligence.volumeRatio >= 1.4 ? "cyan" : "slate",
      width: Math.min(100, Math.max(8, intelligence.volumeRatio * 42))
    },
    {
      label: zh ? "回撤" : "Drawdown",
      value: `${formatSigned(intelligence.drawdownPct)}%`,
      sub: brief.risk,
      tone: intelligence.drawdownPct < -8 ? "amber" : "slate",
      width: Math.min(100, Math.max(8, Math.abs(intelligence.drawdownPct) * 5))
    },
    {
      label: zh ? "数据可信" : "Data Confidence",
      value: `${intelligence.confidencePct}%`,
      sub: dataSource,
      tone: intelligence.confidencePct >= 85 ? "emerald" : intelligence.confidencePct >= 65 ? "cyan" : "amber",
      width: intelligence.confidencePct
    },
    {
      label: "DGWM",
      value: analysisResult ? "READY" : "WAIT",
      sub: analysisResult ? (analysisResult.meta?.engine || "runtime") : (zh ? "待复核" : "review pending"),
      tone: analysisResult ? "emerald" : "cyan",
      width: analysisResult ? 96 : 58
    }
  ];

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[#1d4d6d]/70 bg-[#031426]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between border-b border-[#12324a]/80 bg-[#06213a]/70 px-2.5 py-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-blue-200/70">
          <Database className="h-3 w-3" />
          {zh ? "各类指标" : "Evidence Strip"}
        </div>
        <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
          {currentSymbol.id} · {zh ? "证据压缩" : "signal compression"}
        </div>
      </div>
      <div className="grid grid-cols-6 divide-x divide-[#12324a]/80">
        {items.map((item) => (
          <EvidenceTile key={item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

function EvidenceTile({ item }: { item: EvidenceItem }) {
  return (
    <div className="min-w-0 px-2.5 py-2.5">
      <div className="truncate text-[7px] font-black uppercase tracking-widest text-slate-600">{item.label}</div>
      <div className={`mt-1 truncate font-mono text-[14px] font-black ${evidenceTone(item.tone)}`}>{item.value}</div>
      <div className="mt-0.5 truncate text-[7px] font-bold text-slate-500">{item.sub}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#000814]">
        <div className={`h-full rounded-full ${evidenceBar(item.tone)}`} style={{ width: `${Math.max(6, Math.min(100, item.width))}%` }} />
      </div>
    </div>
  );
}
function FeedMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md border border-[#1d4d6d]/60 bg-[#031426]/90 px-1.5 py-1.5">
      <div className="flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-slate-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-1 font-mono text-[13px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function StrategyLensCard({ strategy, lang }: { strategy: StrategyLens; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";
  const gates = zh
    ? ["主图确认", "风险过滤", "DGWM 复核"]
    : ["Chart check", "Risk filter", "DGWM review"];

  return (
    <div className={`mt-2 rounded-md border p-2.5 ${strategyShell(strategy.tone)}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-200/70">
            {zh ? "专栏分析" : "Column Analysis"}
          </div>
          <div className="mt-1 truncate text-[13px] font-black text-white">{strategy.title}</div>
        </div>
        <div className="text-right font-mono">
          <div className="text-[22px] font-black leading-none text-blue-200/70">{strategy.score}</div>
          <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
        </div>
      </div>
      <div className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{strategy.body}</div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <StrategyCell label={zh ? "阶段" : "Stage"} value={strategy.stage} tone="text-blue-300/70" />
        <StrategyCell label={zh ? "方向" : "Bias"} value={strategy.direction} tone="text-emerald-300" />
        <StrategyCell label={zh ? "风险" : "Risk"} value={strategy.risk} tone={strategy.tone === "rose" || strategy.tone === "amber" ? "text-amber-300" : "text-slate-300"} />
        <StrategyCell label={zh ? "执行" : "Action"} value={strategy.execution} tone="text-blue-300/70" />
      </div>
      <div className="mt-2 rounded border border-[#12324a] bg-[#000814]/60 p-2">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
          <span>{zh ? "证据链可信度" : "Evidence Confidence"}</span>
          <span className="font-mono text-blue-300/70">{strategy.confidence}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#031426]">
          <div
            className="h-full rounded-full bg-blue-500/25"
            style={{ width: `${Math.max(6, strategy.confidence)}%` }}
          />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {gates.map((gate, index) => (
          <div key={gate} className="rounded border border-[#12324a] bg-[#000814]/60 px-1.5 py-1.5">
            <div className="font-mono text-[7px] font-black text-blue-300/70">{String(index + 1).padStart(2, "0")}</div>
            <div className="mt-0.5 truncate text-[8px] font-black text-slate-300">{gate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function StrategyCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-[#12324a] bg-[#000814]/70 px-1.5 py-1.5 text-center">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-0.5 truncate text-[9px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function CatalystBrief({ newsItems, loading, symbol, lang }: { newsItems: NewsItem[]; loading: boolean; symbol: MarketSymbol; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";
  const primary = newsItems[0];
  const bullish = newsItems.filter((item) => item.sentiment === "bullish").length;
  const bearish = newsItems.filter((item) => item.sentiment === "bearish").length;
  const eventTone = bearish > bullish ? "text-rose-300" : bullish > bearish ? "text-emerald-300" : "text-amber-200";
  const eventLabel = bearish > bullish
    ? (zh ? "压力" : "Pressure")
    : bullish > bearish
      ? (zh ? "催化" : "Catalyst")
      : (zh ? "观察" : "Watch");
  const moveImpact = Math.min(28, Math.abs(symbol.change24h || 0) * 4);
  const impact = newsItems.length === 0 ? 0 : Math.round(Math.min(96, Math.max(38, 52 + bullish * 12 - bearish * 7 + moveImpact)));
  const headline = primary
    ? primary.title
    : loading
      ? (zh ? "正在读取新闻流" : "Reading catalyst feed")
      : `${symbol.id} ${zh ? "暂无重大新闻" : "has no major catalyst"}`;
  const summary = primary?.summary || (zh ? "等待新闻、公告、宏观事件进入策略链。" : "Waiting for news, filings, macro events, and narrative changes to enter the strategy chain.");
  const source = primary ? `${primary.source} · ${primary.time}` : (zh ? "PRISM 新闻哨兵" : "PRISM news sentinel");
  const visibleItems = loading && newsItems.length === 0 ? [null, null, null] : newsItems.slice(0, 3);
  const primaryImportance = catalystStarScore(primary, 0, symbol.change24h);
  const primaryTrust = catalystTrustScore(primary);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/70 bg-[#03111f]/95 shadow-[0_18px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between border-b border-amber-300/15 bg-[linear-gradient(90deg,rgba(37,28,11,0.72),rgba(7,11,18,0.96))] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.22em] text-amber-200">
          <Newspaper className="h-3.5 w-3.5" />
          {zh ? "重大行为 / 新闻" : "Major Moves"}
        </div>
        <div className={`font-mono text-[8px] font-black uppercase tracking-widest ${eventTone}`}>
          {eventLabel}
        </div>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-2.5">
          <div className="min-w-0 rounded-md border border-slate-700/70 bg-[#041827]/86 p-2.5">
            <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em] text-slate-500">
              <span>{source}</span>
              <span className="h-1 w-1 rounded-full bg-amber-300/70" />
              <span>{symbol.id}</span>
            </div>
            <div className="mt-1.5 line-clamp-2 text-[12px] font-black leading-tight text-slate-100">{headline}</div>
            <div className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{summary}</div>
          </div>

          <div className="rounded-md border border-amber-300/20 bg-[#06111d]/72 p-2 text-right">
            <div className="text-[7px] font-black uppercase tracking-widest text-amber-200/70">Impact</div>
            <div className={`mt-2 font-mono text-[24px] font-black leading-none ${impact ? eventTone : "text-slate-600"}`}>{impact || "--"}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
              <div className="h-full rounded-full bg-amber-200" style={{ width: `${impact || 12}%` }} />
            </div>
            <div className="mt-2 space-y-0.5">
              <CatalystStarGauge value={primaryImportance} label={zh ? "重要" : "Impact"} />
              <CatalystStarGauge value={primaryTrust} label={zh ? "可信" : "Trust"} muted />
            </div>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <CatalystMetric label={zh ? "利好" : "Bullish"} value={String(bullish)} tone="text-emerald-300" />
          <CatalystMetric label={zh ? "利空" : "Bearish"} value={String(bearish)} tone="text-rose-300" />
          <CatalystMetric label={zh ? "来源" : "Source"} value={primary?.source || "PRISM"} tone="text-amber-200" />
        </div>

        <div className="mt-2 divide-y divide-[#12324a]/70 overflow-hidden rounded-md border border-[#12324a]/80 bg-[#031426]/80">
          {visibleItems.map((item, index) => (
            <div key={item?.id || index} className="px-2.5 py-2">
              <div className="flex items-center justify-between gap-2 text-[7px] font-black uppercase tracking-wider text-slate-600">
                <span>{item ? `${item.source} · ${item.time}` : zh ? "同步中" : "syncing"}</span>
                <span className={item ? sentimentTone(item.sentiment) : "text-slate-500"}>{item?.sentiment || "..."}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="min-w-0 line-clamp-1 text-[9px] font-bold text-slate-300">
                  {item?.summary || (zh ? "等待新闻与事件摘要进入策略链。" : "Waiting for news and event summary.")}
                </div>
                <div className="shrink-0 text-right">
                  <CatalystStarGauge value={catalystStarScore(item, index, symbol.change24h)} label={zh ? "重要" : "Impact"} compact />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function CatalystStarGauge({ value, label, muted = false, compact = false }: { value: number; label: string; muted?: boolean; compact?: boolean }) {
  const score = Math.max(1, Math.min(5, Math.round(value)));
  return (
    <div className={`flex items-center justify-end gap-1 whitespace-nowrap ${compact ? "text-[7px]" : "text-[8px]"} leading-tight`}>
      <span className={muted ? "text-slate-500" : "text-amber-200"}>{label}</span>
      <span className="font-mono tracking-[0.08em]">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < score ? "text-amber-300" : "text-slate-700"}>★</span>
        ))}
      </span>
    </div>
  );
}

function catalystStarScore(item: NewsItem | null | undefined, index: number, change24h: number) {
  if (!item) return 3;
  let score = 3;
  if (index === 0) score += 1;
  if (item.sentiment !== "neutral") score += 1;
  if (Math.abs(change24h || 0) >= 2) score += 1;
  return Math.max(1, Math.min(5, score));
}

function catalystTrustScore(item: NewsItem | null | undefined) {
  if (!item) return 3;
  return item.source.toLowerCase().includes("prism") ? 4 : 5;
}
function CatalystMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded-md border border-[#12324a]/90 bg-[#031426]/86 px-2 py-1.5">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-[10px] font-black ${tone}`}>{value}</div>
    </div>
  );
}
function sentimentTone(sentiment: NewsItem["sentiment"]) {
  if (sentiment === "bullish") return "text-emerald-300";
  if (sentiment === "bearish") return "text-rose-300";
  return "text-slate-400";
}

function StrategyAdvicePanel({ suggestions, lang }: { suggestions: StrategySuggestion[]; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-700/70 bg-[#03111f]/95 p-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-blue-200/70">
          <ListChecks className="h-3 w-3" />
          {zh ? "策略建议" : "Strategy Notes"}
        </div>
        <div className="rounded border border-blue-500/25 bg-blue-500/25 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-widest text-blue-200/70">
          {zh ? "下一步" : "Next"}
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {suggestions.map((item, index) => (
          <div key={item.id} className={`rounded border px-2 py-1.5 ${eventShell(item.tone)}`}>
            <div className="flex items-start gap-2">
              <div className={`mt-0.5 shrink-0 ${eventIconTone(item.tone)}`}>{item.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[7px] font-black text-blue-300/70">{String(index + 1).padStart(2, "0")}</div>
                    <div className="mt-0.5 truncate text-[10px] font-black text-slate-100">{item.title}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-[7px] font-black uppercase tracking-wider text-slate-500">{item.meta}</div>
                    <div className="mt-0.5 text-[8px] tracking-[0.08em] text-amber-300">{"★".repeat(item.stars)}<span className="text-slate-700">{"★".repeat(5 - item.stars)}</span></div>
                  </div>
                </div>
                <div className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{item.body}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildStrategySuggestions(
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
function buildStrategyLens(
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
function buildIntelStats(
  symbols: MarketSymbol[],
  currentSymbol: MarketSymbol,
  marketStatus: MarketDataStatus | undefined,
  analysisResult: AnalysisRunResponse | null | undefined
) {
  const analyzed = symbols.slice(0, 48).map((symbol) => {
    const selected = symbol.id === currentSymbol.id;
    return buildPrismIntelligence(symbol, [], selected ? marketStatus : undefined, selected ? analysisResult : null);
  });
  return {
    defense: analyzed.filter((item) => item.bias === "defense" || item.risk === "stress").length,
    feedIssues: symbols.filter((symbol) => symbol.dataProvider === "yahoo" || symbol.lastDataState === "delayed" || symbol.lastDataState === "stale" || symbol.lastDataState === "error").length
  };
}

function buildIntelEvents(
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

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function getLabels(lang: Language) {
  const zh = lang === "zh" || lang === "tc";
  return {
    subtitle: zh ? "策略专栏 / 原因链" : "Strategy column / reason chain",
    events: zh ? "事件" : "Events",
    defense: zh ? "防御" : "Defense",
    feed: zh ? "数据" : "Feed",
    feedTitle: zh ? "策略证据" : "Strategy Evidence",
    roleTitle: zh ? "专栏职责" : "Column Role",
    footer: zh ? "策略模式下右侧矩阵退场；左侧形成假设与证据链，底部 DGWM 决策台负责最终动作。" : "In strategy mode the right matrix exits; the left builds the hypothesis and evidence chain, while the DGWM deck owns execution.",
    collapse: zh ? "收起策略专栏" : "Collapse strategy column",
    expand: zh ? "展开策略专栏" : "Expand strategy column"
  };
}

function strategyShell(tone: StrategyLens["tone"]) {
  if (tone === "cyan") return "border-blue-500/25 bg-[#031426]/95 shadow-[inset_0_1px_0_rgba(92,130,170,0.08)]";
  if (tone === "amber") return "border-amber-300/30 bg-[#071421]/92 shadow-[inset_0_1px_0_rgba(252,211,77,0.08)]";
  if (tone === "rose") return "border-rose-300/25 bg-[#07101a]/92 shadow-[inset_0_1px_0_rgba(253,164,175,0.06)]";
  if (tone === "emerald") return "border-emerald-300/20 bg-[#03181e]/92 shadow-[inset_0_1px_0_rgba(110,231,183,0.06)]";
  return "border-slate-700/70 bg-[#031426]/95 shadow-[inset_0_1px_0_rgba(148,163,184,0.045)]";
}
function eventShell(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "border-blue-500/25 bg-[#031426]/82";
  if (tone === "amber") return "border-amber-300/24 bg-[#06111d]/74";
  if (tone === "rose") return "border-rose-300/22 bg-[#07101a]/72";
  if (tone === "emerald") return "border-emerald-300/18 bg-[#03181e]/72";
  return "border-[#12324a]/90 bg-[#031426]/82";
}
function eventIconTone(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "text-blue-300/70";
  if (tone === "amber") return "text-amber-300";
  if (tone === "rose") return "text-rose-300";
  if (tone === "emerald") return "text-emerald-300";
  return "text-slate-500";
}


function evidenceTone(tone: EvidenceItem["tone"]) {
  if (tone === "cyan") return "text-blue-300/70";
  if (tone === "amber") return "text-amber-300";
  if (tone === "rose") return "text-rose-300";
  if (tone === "emerald") return "text-emerald-300";
  return "text-slate-300";
}

function evidenceBar(tone: EvidenceItem["tone"]) {
  if (tone === "cyan") return "bg-blue-500/25";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "rose") return "bg-rose-300";
  if (tone === "emerald") return "bg-emerald-300";
  return "bg-slate-500";
}
function eventTagTone(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "border-blue-500/25 bg-blue-500/25 text-blue-200/70";
  if (tone === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  if (tone === "rose") return "border-rose-300/25 bg-rose-300/10 text-rose-200";
  if (tone === "emerald") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  return "border-[#12324a] bg-[#000814] text-slate-400";
}
