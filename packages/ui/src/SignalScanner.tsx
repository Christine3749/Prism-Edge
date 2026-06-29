import { Activity, AlertTriangle, ChevronRight, Database, ListChecks, Newspaper, Radar, ShieldAlert, Sparkles, Target, Zap } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { buildPrismIntelligence, describePrismIntelligence, type PrismIntelligence } from "../../shared/src/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol, NewsItem } from "../../shared/src/types";
import type { Language } from "../../shared/src/translations";

interface SignalScannerProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  onSymbolSelect: (symbol: MarketSymbol) => void;
  onHandleHoverChange?: (active: boolean) => void;
  onExpandedChange?: (expanded: boolean) => void;
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
  integratedBottom = false,
  revealHandle = false
}: SignalScannerProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const labels = getLabels(lang);

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
    ? "border-cyan-400/70 bg-slate-900 text-sky-300 opacity-100 shadow-[0_0_34px_rgba(34,211,238,0.28)]"
    : "border-cyan-400/15 bg-slate-950/20 text-sky-300/0 opacity-25 shadow-none";
  const workspaceWidth = "clamp(760px, 50vw, 960px)";

  return (
    <aside
      className="relative z-[70] hidden h-full shrink-0 overflow-visible xl:block"
      style={{
        width: collapsed ? 0 : workspaceWidth,
        transition: "width 520ms cubic-bezier(0.22, 1, 0.36, 1)"
      }}
    >
      <div
        className={`absolute inset-y-0 left-0 flex flex-col border-r border-slate-800/80 bg-[#050914] text-slate-200 shadow-[18px_0_40px_rgba(2,6,23,0.26)] transition-[transform,opacity,filter] duration-500 ${
          collapsed ? "pointer-events-none -translate-x-5 opacity-0 blur-[1px]" : "translate-x-0 opacity-100 blur-0"
        }`}
        style={{ width: workspaceWidth, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
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
  const changeTone = currentSymbol.change24h >= 0 ? "text-emerald-300" : "text-rose-300";
  const deskTabs = zh
    ? ["THESIS", "EVENTS", "NEWS", "FLOW", "RISK", "DGWM", "SHORTS", "INSIDERS", "FEED"]
    : ["THESIS", "EVENTS", "NEWS", "FLOW", "RISK", "DGWM", "SHORTS", "INSIDERS", "FEED"];
  const marketCapProxy = currentSymbol.type === "crypto" ? "CRYPTO" : (currentSymbol.exchange || currentSymbol.market || "EQUITY").toUpperCase();

  return (
    <>
      <div className="border-b border-slate-800 bg-[#070b12]">
        <div className="flex h-7 items-center gap-5 overflow-x-auto border-b border-slate-900 bg-[#05070d] px-3 pr-10 no-scrollbar">
          {deskTabs.map((item, index) => (
            <span
              key={item}
              className={`shrink-0 font-mono text-[8px] font-black uppercase tracking-[0.18em] ${index === 0 ? "text-cyan-300" : "text-slate-500"}`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_178px] gap-3 p-3 pr-9">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300">
              <Radar className="h-3.5 w-3.5" />
              {zh ? "单票作战室" : "Single Asset War Room"}
            </div>
            <div className="mt-2 flex min-w-0 items-end gap-2">
              <h2 className="truncate text-[19px] font-black leading-none text-white">{currentSymbol.id}</h2>
              <span className="mb-0.5 shrink-0 border border-slate-700 bg-[#0b111c] px-1.5 py-0.5 font-mono text-[8px] font-black uppercase tracking-wider text-slate-400">
                {marketCapProxy}
              </span>
              <span className="mb-0.5 shrink-0 font-mono text-[10px] font-black text-slate-300">{priceText}</span>
              <span className={`mb-0.5 shrink-0 font-mono text-[10px] font-black ${changeTone}`}>
                {formatSigned(currentSymbol.change24h)}%
              </span>
            </div>
            <div className="mt-1 truncate text-[9px] font-semibold text-slate-500">
              {currentSymbol.name} / {sourceLabel} / {feedState}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <WarRoomMicroStat label={zh ? "评分" : "Score"} value={String(intelligence.score)} tone={warScoreTone(intelligence.score)} />
            <WarRoomMicroStat label={zh ? "事件" : "Events"} value={String(events.length)} tone="text-cyan-300" />
            <WarRoomMicroStat label={zh ? "防御" : "Defense"} value={String(stats.defense)} tone="text-amber-300" />
            <WarRoomMicroStat label={zh ? "数据" : "Feed"} value={String(stats.feedIssues)} tone={stats.feedIssues > 0 ? "text-amber-300" : "text-emerald-300"} />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#05070d] p-2.5">
        <div className="grid grid-cols-[minmax(0,1.02fr)_minmax(268px,0.98fr)] gap-2.5">
          <div className="min-w-0 space-y-2.5">
            <section className="border border-slate-800 bg-[#080b12]">
              <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1119] px-3 py-2">
                <div className="font-mono text-[8px] font-black uppercase tracking-[0.22em] text-cyan-300">
                  {zh ? "作战假设" : "Battle Thesis"}
                </div>
                <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">
                  {strategy.stage} / {strategy.execution}
                </div>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_94px] gap-3 p-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[16px] font-black text-slate-100">{brief.headline}</h3>
                  <p className="mt-2 line-clamp-3 text-[10px] leading-relaxed text-slate-400">{brief.action}</p>
                </div>
                <div className="border-l border-slate-800 pl-3 text-right font-mono">
                  <div className={`text-[34px] font-black leading-none ${warScoreTone(intelligence.score)}`}>{intelligence.score}</div>
                  <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
                  <div className="mt-2 border border-cyan-400/25 bg-cyan-400/[0.06] px-1.5 py-1 text-[8px] font-black text-cyan-200">
                    {intelligence.confidencePct}% CONF
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-4 border-t border-slate-800">
                <WarRoomMetricCell label={zh ? "方向" : "Bias"} value={brief.bias} tone={warBiasTone(intelligence.bias)} />
                <WarRoomMetricCell label={zh ? "结构" : "Setup"} value={brief.setup} tone="text-cyan-300" />
                <WarRoomMetricCell label={zh ? "风险" : "Risk"} value={brief.risk} tone={warRiskTone(intelligence.risk)} />
                <WarRoomMetricCell label={zh ? "执行" : "Exec"} value={brief.action.split(" ")[0] || strategy.execution} tone="text-slate-200" />
              </div>
              <div className="space-y-2 border-t border-slate-800 p-3">
                <WarRoomBar label={zh ? "证据可信" : "Evidence Confidence"} value={intelligence.confidencePct} tone="cyan" left="LOW" right="LOCK" />
                <WarRoomBar label={zh ? "量能热度" : "Volume Heat"} value={Math.min(100, intelligence.volumeRatio * 46)} tone="emerald" left="DRY" right="FLOW" />
              </div>
            </section>

            <WarRoomNewsPanel
              newsItems={newsItems}
              loading={newsLoading}
              symbol={currentSymbol}
              lang={lang}
            />
          </div>

          <div className="min-w-0 space-y-2.5">
            <WarRoomPressurePanel
              intelligence={intelligence}
              brief={brief}
              sourceLabel={sourceLabel}
              feedState={feedState}
              analysisLinked={Boolean(analysisResult)}
              lang={lang}
            />
            <WarRoomActionStack suggestions={suggestions} lang={lang} />
            <StrategyEventTape events={events} lang={lang} onSymbolSelect={onSymbolSelect} />
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
        <div className="border-t border-slate-900 bg-[#05070d] p-2.5">
          <div className="border border-slate-800 bg-[#080b12] p-2 text-[9px] leading-relaxed text-slate-500">
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

function WarRoomMicroStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border border-slate-800 bg-[#080d15] px-2 py-1.5">
      <div className="truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-0.5 truncate font-mono text-[13px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function WarRoomMetricCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 border-r border-slate-800 px-2.5 py-2 last:border-r-0">
      <div className="truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[10px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

function WarRoomBar({ label, value, tone, left, right }: { label: string; value: number; tone: "cyan" | "emerald" | "amber" | "rose"; left: string; right: string }) {
  const width = Math.max(4, Math.min(100, Math.round(value)));
  const fill = {
    cyan: "bg-cyan-300",
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
      <div className="mt-1 h-1.5 bg-slate-950">
        <div className={`h-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-700">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

function WarRoomNewsPanel({ newsItems, loading, symbol, lang }: { newsItems: NewsItem[]; loading: boolean; symbol: MarketSymbol; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";
  const rows = newsItems.slice(0, 4);

  return (
    <section className="border border-slate-800 bg-[#080b12]">
      <div className="flex items-center justify-between border-b border-amber-300/20 bg-[#111008] px-3 py-2">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-amber-300">
          <Newspaper className="h-3 w-3" />
          {zh ? "重大行为 / 新闻" : "Major Behavior / News"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-emerald-300">
          {rows.length > 0 ? (zh ? "催化" : "Catalyst") : "SCAN"}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_84px] gap-2 p-3">
        <div className="min-w-0 border border-slate-800 bg-[#070b11] p-2.5">
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
        <div className="border border-amber-300/20 bg-amber-300/[0.045] p-2 text-right">
          <div className="font-mono text-[7px] font-black uppercase tracking-widest text-amber-300">IMPACT</div>
          <div className="mt-2 font-mono text-[25px] font-black leading-none text-emerald-300">{Math.max(42, Math.min(91, 52 + rows.length * 8 + Math.abs(symbol.change24h || 0) * 3)).toFixed(0)}</div>
          <div className="mt-3 space-y-1 font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">
            <div>{zh ? "事件" : "Events"} {rows.length}</div>
            <div>{zh ? "方向" : "Bias"} {symbol.change24h >= 0 ? "UP" : "DOWN"}</div>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-800 border-t border-slate-800">
        {(rows.length > 0 ? rows : [null, null, null]).map((item, index) => (
          <div key={item?.id || `empty-${index}`} className="grid grid-cols-[minmax(0,1fr)_70px] gap-2 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-[9px] font-bold text-slate-300">
                {item?.title || (loading ? "Loading catalyst row" : "Awaiting verified catalyst")}
              </div>
              <div className="mt-0.5 truncate font-mono text-[7px] uppercase tracking-wider text-slate-600">
                {item ? `${item.source} / ${item.time}` : "PRISM MARKET PULSE"}
              </div>
            </div>
            <div className="text-right font-mono text-[7px] font-black uppercase tracking-widest">
              <span className={item ? sentimentTone(item.sentiment) : "text-slate-500"}>{item?.sentiment || "..."}</span>
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
    <section className="border border-slate-800 bg-[#080b12]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1119] px-3 py-2">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <Activity className="h-3 w-3" />
          {zh ? "压力曲线" : "Pressure Graph"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{sourceLabel} / {feedState}</div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-3 p-3">
        <div className="min-w-0 border border-slate-800 bg-[#060a10] p-2">
          <WarRoomMiniDepth
            values={[trendPressure, volumePressure, intelligence.confidencePct, shortPressure, modelPressure]}
          />
        </div>
        <div className="space-y-1.5">
          <WarRoomMicroStat label={zh ? "结构" : "Setup"} value={brief.setup} tone="text-cyan-300" />
          <WarRoomMicroStat label={zh ? "风险" : "Risk"} value={brief.risk} tone={warRiskTone(intelligence.risk)} />
          <WarRoomMicroStat label="DGWM" value={analysisLinked ? "LINK" : "WAIT"} tone={analysisLinked ? "text-emerald-300" : "text-amber-300"} />
        </div>
      </div>
      <div className="space-y-2 border-t border-slate-800 p-3">
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
    <svg className="h-32 w-full" viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="warRoomDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.62" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[14, 28, 42, 56, 70].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#1e293b" strokeWidth="0.7" />)}
      {[20, 40, 60, 80].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="76" stroke="#111827" strokeWidth="0.7" />)}
      <polygon points={area} fill="url(#warRoomDepthFill)" />
      <polyline points={points} fill="none" stroke="#22d3ee" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="72" y2="72" stroke="#334155" strokeWidth="1" />
    </svg>
  );
}

function WarRoomActionStack({ suggestions, lang }: { suggestions: StrategySuggestion[]; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";

  return (
    <section className="border border-slate-800 bg-[#080b12]">
      <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1119] px-3 py-2">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <ListChecks className="h-3 w-3" />
          {zh ? "执行检查" : "Execution Checks"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">DGWM GATE</div>
      </div>
      <div className="divide-y divide-slate-800">
        {suggestions.slice(0, 4).map((item, index) => (
          <div key={item.id} className="grid grid-cols-[30px_minmax(0,1fr)_54px] gap-2 px-3 py-2">
            <div className="font-mono text-[9px] font-black text-cyan-300">{String(index + 1).padStart(2, "0")}</div>
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

function formatDeskPrice(price: number, precision: number) {
  if (!Number.isFinite(price) || price <= 0) return "--";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(precision, 2),
    maximumFractionDigits: Math.min(Math.max(precision, 2), 6)
  });
}

function warScoreTone(score: number) {
  if (score >= 74) return "text-emerald-300";
  if (score >= 62) return "text-cyan-300";
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
    <div className="rounded-md border border-slate-800 bg-slate-900/40">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d1524]/70 px-2.5 py-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-sky-200">
          <Activity className="h-3 w-3" />
          {zh ? "事件流" : "Event Tape"}
        </div>
        <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
          {zh ? "原因链" : "Cause Chain"}
        </div>
      </div>
      <div className="divide-y divide-slate-900">
        {events.slice(0, 5).map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => event.symbol && onSymbolSelect(event.symbol)}
            disabled={!event.symbol}
            className="group flex w-full items-start gap-2 px-2.5 py-2 text-left transition-colors hover:bg-slate-900/80 disabled:cursor-default"
          >
            <div className={`mt-0.5 shrink-0 ${eventIconTone(event.tone)}`}>{event.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[10px] font-black text-slate-200">{event.title}</div>
                <div className={`shrink-0 rounded border px-1.5 py-[1px] font-mono text-[7px] font-black uppercase tracking-wider ${eventTagTone(event.tone)}`}>
                  {event.meta}
                </div>
              </div>
              <div className="mt-1 line-clamp-2 text-[8px] leading-relaxed text-slate-500 group-hover:text-slate-400">{event.body}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
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
    <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/70 bg-[#090f1a]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between border-b border-slate-800/80 bg-[#0d1524]/70 px-2.5 py-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-sky-200">
          <Database className="h-3 w-3" />
          {zh ? "各类指标" : "Evidence Strip"}
        </div>
        <div className="font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">
          {currentSymbol.id} · {zh ? "证据压缩" : "signal compression"}
        </div>
      </div>
      <div className="grid grid-cols-6 divide-x divide-slate-800/80">
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
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#050914]">
        <div className={`h-full rounded-full ${evidenceBar(item.tone)}`} style={{ width: `${Math.max(6, Math.min(100, item.width))}%` }} />
      </div>
    </div>
  );
}
function FeedMetric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="rounded-md border border-slate-700/60 bg-[#090f1a]/90 px-1.5 py-1.5">
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
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-sky-200">
            {zh ? "专栏分析" : "Column Analysis"}
          </div>
          <div className="mt-1 truncate text-[13px] font-black text-white">{strategy.title}</div>
        </div>
        <div className="text-right font-mono">
          <div className="text-[22px] font-black leading-none text-sky-200">{strategy.score}</div>
          <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
        </div>
      </div>
      <div className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{strategy.body}</div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <StrategyCell label={zh ? "阶段" : "Stage"} value={strategy.stage} tone="text-sky-300" />
        <StrategyCell label={zh ? "方向" : "Bias"} value={strategy.direction} tone="text-emerald-300" />
        <StrategyCell label={zh ? "风险" : "Risk"} value={strategy.risk} tone={strategy.tone === "rose" || strategy.tone === "amber" ? "text-amber-300" : "text-slate-300"} />
        <StrategyCell label={zh ? "执行" : "Action"} value={strategy.execution} tone="text-sky-300" />
      </div>
      <div className="mt-2 rounded border border-slate-800 bg-slate-950/60 p-2">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
          <span>{zh ? "证据链可信度" : "Evidence Confidence"}</span>
          <span className="font-mono text-sky-300">{strategy.confidence}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-900">
          <div
            className="h-full rounded-full bg-sky-300"
            style={{ width: `${Math.max(6, strategy.confidence)}%` }}
          />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {gates.map((gate, index) => (
          <div key={gate} className="rounded border border-slate-800 bg-slate-950/60 px-1.5 py-1.5">
            <div className="font-mono text-[7px] font-black text-sky-300">{String(index + 1).padStart(2, "0")}</div>
            <div className="mt-0.5 truncate text-[8px] font-black text-slate-300">{gate}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function StrategyCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-slate-800 bg-slate-950/70 px-1.5 py-1.5 text-center">
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
    <div className="overflow-hidden rounded-lg border border-slate-700/70 bg-[#070b12]/95 shadow-[0_18px_48px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.035)]">
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
          <div className="min-w-0 rounded-md border border-slate-700/70 bg-[#0b101b]/86 p-2.5">
            <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.18em] text-slate-500">
              <span>{source}</span>
              <span className="h-1 w-1 rounded-full bg-amber-300/70" />
              <span>{symbol.id}</span>
            </div>
            <div className="mt-1.5 line-clamp-2 text-[12px] font-black leading-tight text-slate-100">{headline}</div>
            <div className="mt-2 line-clamp-2 text-[9px] leading-relaxed text-slate-500">{summary}</div>
          </div>

          <div className="rounded-md border border-amber-300/20 bg-[#120f08]/72 p-2 text-right">
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

        <div className="mt-2 divide-y divide-slate-800/70 overflow-hidden rounded-md border border-slate-800/80 bg-[#050914]/80">
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
    <div className="min-w-0 rounded-md border border-slate-800/90 bg-[#080d17]/86 px-2 py-1.5">
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
    <div className="mt-2 overflow-hidden rounded-lg border border-slate-700/70 bg-[#070b12]/95 p-2.5 shadow-[0_18px_48px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-sky-200">
          <ListChecks className="h-3 w-3" />
          {zh ? "策略建议" : "Strategy Notes"}
        </div>
        <div className="rounded border border-sky-300/20 bg-sky-300/10 px-1.5 py-0.5 font-mono text-[7px] font-black uppercase tracking-widest text-sky-200">
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
                    <div className="font-mono text-[7px] font-black text-sky-300">{String(index + 1).padStart(2, "0")}</div>
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
  if (tone === "cyan") return "border-sky-300/25 bg-[#080f1d]/95 shadow-[inset_0_1px_0_rgba(125,211,252,0.08)]";
  if (tone === "amber") return "border-amber-300/30 bg-[#100d08]/92 shadow-[inset_0_1px_0_rgba(252,211,77,0.08)]";
  if (tone === "rose") return "border-rose-300/25 bg-[#120910]/92 shadow-[inset_0_1px_0_rgba(253,164,175,0.06)]";
  if (tone === "emerald") return "border-emerald-300/20 bg-[#07110f]/92 shadow-[inset_0_1px_0_rgba(110,231,183,0.06)]";
  return "border-slate-700/70 bg-[#080d17]/95 shadow-[inset_0_1px_0_rgba(148,163,184,0.045)]";
}
function eventShell(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "border-sky-300/18 bg-[#08111f]/82";
  if (tone === "amber") return "border-amber-300/24 bg-[#120f08]/74";
  if (tone === "rose") return "border-rose-300/22 bg-[#120910]/72";
  if (tone === "emerald") return "border-emerald-300/18 bg-[#07110f]/72";
  return "border-slate-800/90 bg-[#080d17]/82";
}
function eventIconTone(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "text-sky-300";
  if (tone === "amber") return "text-amber-300";
  if (tone === "rose") return "text-rose-300";
  if (tone === "emerald") return "text-emerald-300";
  return "text-slate-500";
}


function evidenceTone(tone: EvidenceItem["tone"]) {
  if (tone === "cyan") return "text-sky-300";
  if (tone === "amber") return "text-amber-300";
  if (tone === "rose") return "text-rose-300";
  if (tone === "emerald") return "text-emerald-300";
  return "text-slate-300";
}

function evidenceBar(tone: EvidenceItem["tone"]) {
  if (tone === "cyan") return "bg-sky-300";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "rose") return "bg-rose-300";
  if (tone === "emerald") return "bg-emerald-300";
  return "bg-slate-500";
}
function eventTagTone(tone: IntelEvent["tone"]) {
  if (tone === "cyan") return "border-sky-300/20 bg-sky-300/8 text-sky-200";
  if (tone === "amber") return "border-amber-300/25 bg-amber-300/10 text-amber-200";
  if (tone === "rose") return "border-rose-300/25 bg-rose-300/10 text-rose-200";
  if (tone === "emerald") return "border-emerald-300/20 bg-emerald-300/10 text-emerald-200";
  return "border-slate-700 bg-[#050914] text-slate-400";
}
