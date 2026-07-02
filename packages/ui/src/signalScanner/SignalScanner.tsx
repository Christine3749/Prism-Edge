import { Activity, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@shared/types";
import { ExecutionControlSummary } from "./ExecutionControlSummary";
import { MatrixModeSummary } from "./MatrixModeSummary";
import { SingleAssetWarRoom } from "./SingleAssetWarRoom";
import {
  buildIntelEvents,
  buildIntelStats,
  buildStrategyLens,
  buildStrategySuggestions
} from "./intelBuilders";
import type { IntelStats, SignalScannerProps, StrategyLens, StrategySuggestion } from "./types";

export default function SignalScanner({
  currentSymbol,
  symbolsList,
  marketStatus,
  analysisResult,
  lang,
  onSymbolSelect,
  activeWorkspaceDeck = null,
  integratedBottom = false,
  theme = "dark"
}: SignalScannerProps) {
  const collapsed = activeWorkspaceDeck === null;
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const signalMode = activeWorkspaceDeck === 2;
  const matrixMode = activeWorkspaceDeck === 3;
  const executionMode = activeWorkspaceDeck === 4;
  const reservedMode = activeWorkspaceDeck === 5 || activeWorkspaceDeck === 6;
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
  const workspaceWidth = signalMode || matrixMode || executionMode || reservedMode ? "clamp(258px, 19vw, 336px)" : "clamp(900px, 46vw, 1180px)";
  const resolvedDeck = activeWorkspaceDeck;

  return (
    <aside
      className="relative z-[70] hidden h-full shrink-0 overflow-visible xl:block"
      data-workspace-deck={resolvedDeck === null ? "none" : workspaceDeckLabel(resolvedDeck)}
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
        {signalMode ? (
          <SignalModeSummary
            currentSymbol={currentSymbol}
            strategy={strategy}
            stats={stats}
            suggestions={suggestions}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
            theme={theme}
          />
        ) : matrixMode ? (
          <MatrixModeSummary
            currentSymbol={currentSymbol}
            symbolsList={symbolsList}
            marketStatus={marketStatus}
            lang={lang}
            theme={theme}
          />
        ) : executionMode ? (
          <ExecutionControlSummary
            currentSymbol={currentSymbol}
            symbolsList={symbolsList}
            marketStatus={marketStatus}
            lang={lang}
            theme={theme}
          />
        ) : reservedMode && activeWorkspaceDeck !== null ? (
          <ReservedWorkspaceSummary deck={activeWorkspaceDeck} lang={lang} theme={theme} />
        ) : (
          <SingleAssetWarRoom
            currentSymbol={currentSymbol}
            events={events}
            stats={stats}
            suggestions={suggestions}
            newsItems={newsItems}
            newsLoading={newsLoading}
            marketStatus={marketStatus}
            analysisResult={analysisResult}
            lang={lang}
            integratedBottom={false}
            onSymbolSelect={onSymbolSelect}
          />
        )}
      </div>

    </aside>
  );
}

function SignalModeSummary({
  currentSymbol,
  strategy,
  stats,
  suggestions,
  marketStatus,
  analysisResult,
  lang,
  theme
}: {
  currentSymbol: SignalScannerProps["currentSymbol"];
  strategy: StrategyLens;
  stats: IntelStats;
  suggestions: StrategySuggestion[];
  marketStatus: SignalScannerProps["marketStatus"];
  analysisResult: SignalScannerProps["analysisResult"];
  lang: SignalScannerProps["lang"];
  theme: NonNullable<SignalScannerProps["theme"]>;
}) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const changePositive = currentSymbol.change24h >= 0;
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "feed";
  const source = marketStatus?.source || currentSymbol.lastSource || currentSymbol.dataProvider || currentSymbol.exchange || "gateway";
  const scoreTone = dark
    ? strategy.score >= 68 ? "text-emerald-300" : strategy.score >= 52 ? "text-amber-300" : "text-rose-300"
    : strategy.score >= 68 ? "text-emerald-700" : strategy.score >= 52 ? "text-amber-700" : "text-red-600";
  const changeTone = dark
    ? changePositive ? "text-emerald-300" : "text-rose-300"
    : changePositive ? "text-emerald-700" : "text-red-600";
  const nextActions = suggestions.slice(0, 3);

  return (
    <div className={`flex h-full min-h-0 flex-col shadow-[18px_0_44px_rgba(0,12,18,0.28)] ${dark ? "border-r border-white/10 bg-[#07111f] text-slate-200" : "border-r border-[#d9e5f0] bg-[#f7fbff] text-[#102136]"}`}>
      <div className={`border-b px-3 py-3 ${dark ? "border-white/10 bg-[#0a1626]" : "border-[#d9e5f0] bg-white"}`}>
        <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
          <Activity className="h-3.5 w-3.5" />
          {zh ? "II / 信号模式" : "II / Signal Mode"}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`truncate text-[15px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{currentSymbol.id}</div>
            <div className="mt-1 truncate font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{source} / {feedState}</div>
          </div>
          <div className={`shrink-0 text-right font-mono ${scoreTone}`}>
            <div className="text-[28px] font-black leading-none">{strategy.score}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className={`border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className="flex items-center justify-between gap-2">
            <div className={`font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-slate-400" : "text-slate-600"}`}>{zh ? "价格" : "Price"}</div>
            <TrendingUp className={`h-3.5 w-3.5 ${changeTone}`} />
          </div>
          <div className={`mt-2 font-mono text-[20px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{currentSymbol.price.toLocaleString(undefined, { maximumFractionDigits: currentSymbol.precision })}</div>
          <div className={`mt-1 font-mono text-[11px] font-black ${changeTone}`}>{changePositive ? "+" : ""}{currentSymbol.change24h.toFixed(2)}%</div>
        </section>

        <section className={`mt-3 border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <Gauge className="h-3.5 w-3.5" />
            {zh ? "信号摘要" : "Signal Summary"}
          </div>
          <div className={`mt-2 text-[13px] font-black ${dark ? "text-slate-100" : "text-[#102136]"}`}>{strategy.title}</div>
          <p className={`mt-1 line-clamp-4 text-[10px] leading-relaxed ${dark ? "text-slate-400" : "text-[#607188]"}`}>{strategy.body}</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[8px] font-black uppercase tracking-widest">
            <MetricPill label={zh ? "风险" : "Risk"} value={strategy.risk} dark={dark} />
            <MetricPill label={zh ? "阶段" : "Stage"} value={strategy.stage} dark={dark} />
            <MetricPill label={zh ? "数据" : "Feed"} value={`${stats.feedIssues}`} dark={dark} />
            <MetricPill label="DGWM" value={analysisResult ? (zh ? "已连接" : "LINK") : (zh ? "等待" : "WAIT")} dark={dark} />
          </div>
        </section>

        <section className={`mt-3 border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-amber-300" : "text-amber-700"}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {zh ? "下一步" : "Next Actions"}
          </div>
          <div className="mt-2 space-y-2">
            {nextActions.map((item) => (
              <div key={item.id} className={`border px-2 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className={`truncate text-[10px] font-black ${dark ? "text-slate-200" : "text-[#102136]"}`}>{item.title}</div>
                <div className={`mt-0.5 line-clamp-2 text-[8px] leading-relaxed ${dark ? "text-slate-500" : "text-[#607188]"}`}>{item.body}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReservedWorkspaceSummary({
  deck,
  lang,
  theme
}: {
  deck: NonNullable<SignalScannerProps["activeWorkspaceDeck"]>;
  lang: SignalScannerProps["lang"];
  theme: NonNullable<SignalScannerProps["theme"]>;
}) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const learningMode = deck === 5;
  const title = learningMode
    ? zh ? "复盘与归因" : "Learning & Attribution"
    : zh ? "元治理仲裁" : "Meta-Governance";
  const headline = learningMode
    ? zh ? "把每次执行变成可校准的证据。" : "Turn every execution into calibration evidence."
    : zh ? "判断整套 I-V 系统现在是否可信。" : "Judge whether the I-V system is currently trustworthy.";
  const body = learningMode
    ? zh ? "V 读取执行成交与 DGWM 决策快照，分离单笔复盘和策略校准，低频回灌给 III/IV。" : "V reads fills and DGWM snapshots, separating trade review from strategy calibration before low-frequency feedback to III/IV."
    : zh ? "VI 悬在 I-V 之上，不产出信号，只在系统冲突、异常或过度自信时做允许、否决、降级或冻结。" : "VI sits above I-V, producing no signals; it allows, vetoes, degrades, or freezes the system when conflicts or anomalies appear.";
  const score = learningMode ? "73" : "WAIT";
  const metricRows = learningMode
    ? [
        [zh ? "硬数据" : "Hard Data", "PnL / fills"],
        [zh ? "软证据" : "Soft Evidence", "DGWM snap"],
        [zh ? "节奏" : "Cadence", zh ? "每周" : "Weekly"],
        [zh ? "回灌" : "Feedback", "III / IV"]
      ]
    : [
        [zh ? "左脑" : "Left Agent", "Ethan7586"],
        [zh ? "右脑" : "Right Agent", "Christine3749"],
        [zh ? "权限" : "Authority", zh ? "否决" : "Veto"],
        [zh ? "施工" : "Build", zh ? "暂缓" : "Deferred"]
      ];
  const steps = learningMode
    ? [
        zh ? "执行成交记录进入归因引擎。" : "Execution records enter attribution.",
        zh ? "DGWM 决策快照补足当时判断。" : "DGWM snapshots preserve the original judgment.",
        zh ? "单笔复盘和策略校准分开处理。" : "Trade review and strategy calibration stay separate.",
        zh ? "校准结果批量、低频回灌。" : "Calibration feeds back in low-frequency batches."
      ]
    : [
        zh ? "Ethan7586 负责收敛验证和风险泼冷水。" : "Ethan7586 performs convergent verification and risk checks.",
        zh ? "Christine3749 负责机会穿透和过度保守识别。" : "Christine3749 detects missed opportunities and excess conservatism.",
        zh ? "冲突时进入仲裁台，不日常插手。" : "Only conflicts enter arbitration; daily flow stays untouched.",
        zh ? "真实接入等 V 积累足够复盘样本。" : "Real integration waits for enough V-layer review samples."
      ];

  return (
    <div className={`flex h-full min-h-0 flex-col border-r ${dark ? "border-white/10 bg-[#07111f] text-slate-200" : "border-[#d9e5f0] bg-[#f7fbff] text-[#102136]"}`}>
      <div className={`border-b px-3 py-3 ${dark ? "border-white/10 bg-[#0a1626]" : "border-[#d9e5f0] bg-white"}`}>
        <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
          <Activity className="h-3.5 w-3.5" />
          {workspaceDeckLabel(deck)} / {title}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[15px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{headline}</div>
            <p className={`mt-2 text-[10px] leading-relaxed ${dark ? "text-slate-400" : "text-[#607188]"}`}>{body}</p>
          </div>
          <div className={`shrink-0 text-right font-mono ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <div className="text-[26px] font-black leading-none">{score}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">{learningMode ? "ATTR" : "ARB"}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className={`border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <Gauge className="h-3.5 w-3.5" />
            {learningMode ? zh ? "复盘链路" : "Review Chain" : zh ? "仲裁边界" : "Arbitration Boundary"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[8px] font-black uppercase tracking-widest">
            {metricRows.map(([label, value]) => <MetricPill key={label} label={label} value={value} dark={dark} />)}
          </div>
        </section>

        <section className={`mt-3 border p-3 ${dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white"}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-amber-300" : "text-amber-700"}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {learningMode ? zh ? "学习约束" : "Learning Constraints" : zh ? "最高闸门" : "Final Gate"}
          </div>
          <div className="mt-2 space-y-2">
            {steps.map((item, index) => (
              <div key={item} className={`border px-2 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className={`font-mono text-[8px] font-black ${dark ? "text-blue-200/80" : "text-blue-700"}`}>0{index + 1}</div>
                <div className={`mt-0.5 text-[10px] leading-relaxed ${dark ? "text-slate-300" : "text-[#28384d]"}`}>{item}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
function MetricPill({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`min-w-0 border px-2 py-1.5 ${dark ? "border-white/10 bg-[#050b14]" : "border-[#d9e5f0] bg-[#f7fbff]"}`}>
      <div className={dark ? "truncate text-slate-600" : "truncate text-[#72839a]"}>{label}</div>
      <div className={dark ? "mt-1 truncate text-blue-200/85" : "mt-1 truncate text-[#1d4ed8]"}>{value}</div>
    </div>
  );
}

function workspaceDeckLabel(deck: NonNullable<SignalScannerProps["activeWorkspaceDeck"]>) {
  return deck === 1 ? "I" : deck === 2 ? "II" : deck === 3 ? "III" : deck === 4 ? "IV" : deck === 5 ? "V" : "VI";
}
