import { Activity, ListChecks } from "lucide-react";
import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { clampSignalMetric, formatCompactStat, formatSigned } from "./formatters";
import { WarRoomActionStack, WarRoomMiniDepth } from "./PrimitiveCells";
import { eventTagTone, warScoreTone } from "./toneClasses";
import type { IntelEvent, IntelStats, StrategyLens, StrategySuggestion } from "./types";

interface TradingSignalsWarRoomProps {
  currentSymbol: MarketSymbol;
  strategy: StrategyLens;
  events: IntelEvent[];
  stats: IntelStats;
  suggestions: StrategySuggestion[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
}

export function TradingSignalsWarRoom({
  currentSymbol,
  strategy,
  events,
  stats,
  suggestions,
  marketStatus,
  analysisResult,
  lang
}: TradingSignalsWarRoomProps) {
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
