import { Activity, Check, Info } from "lucide-react";
import { buildPrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, Candle, MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { clampSignalMetric, formatCompactStat, formatDeskPrice, formatSigned } from "../signalScanner/formatters";

interface TradingSignalsWorkbenchProps {
  currentSymbol: MarketSymbol;
  candles: Candle[];
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
  theme: "dark" | "light";
}

type MetricTone = "blue" | "amber" | "rose";

export function TradingSignalsWorkbench({
  currentSymbol,
  candles,
  marketStatus,
  analysisResult,
  lang,
  theme
}: TradingSignalsWorkbenchProps) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const intelligence = buildPrismIntelligence(currentSymbol, candles, marketStatus, analysisResult);
  const sourceLabel = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.exchange || "gateway";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "local";
  const volumeProxy = Math.max(1, currentSymbol.volume24h || currentSymbol.price * 100000);
  const shortInterest = clampSignalMetric(8 + Math.abs(intelligence.drawdownPct) * 0.9 + intelligence.volumeRatio * 6.5, 4, 42);
  const shortValue = currentSymbol.price * volumeProxy * Math.max(0.08, shortInterest / 100);
  const daysToCover = clampSignalMetric(0.65 + intelligence.volumeRatio * 0.7 + Math.abs(intelligence.momentumPct) * 0.08, 0.4, 8.8);
  const sharesOnLoan = volumeProxy * clampSignalMetric(0.18 + shortInterest / 95, 0.1, 0.72);
  const costToBorrow = clampSignalMetric(0.24 + Math.abs(intelligence.drawdownPct) * 0.04 + (100 - intelligence.score) * 0.012, 0.08, 8.4);
  const utilization = clampSignalMetric(22 + shortInterest * 1.35 + intelligence.volumeRatio * 5.8, 12, 96);
  const pressure = clampSignalMetric(50 + Math.abs(intelligence.drawdownPct) * 3.4 + intelligence.volumeRatio * 9 - intelligence.confidencePct * 0.16, 10, 96);
  const metrics = [
    { label: zh ? "空头占流通" : "Short Interest % of FF", value: `${shortInterest.toFixed(2)}%`, sub: zh ? "3个月" : "3 months", delta: `${formatSigned(currentSymbol.change24h)}%`, tone: "blue" as const, seed: 1 },
    { label: zh ? "空头市值" : "Short Interest Value", value: formatCompactStat(shortValue), sub: zh ? "3个月" : "3 months", delta: `${formatSigned(shortInterest - 12)}%`, tone: "blue" as const, seed: 2 },
    { label: zh ? "回补天数" : "Days to Cover", value: `${daysToCover.toFixed(2)} ${zh ? "天" : "Days"}`, sub: zh ? "3个月" : "3 months", delta: `${formatSigned(daysToCover - 1.6)}%`, tone: "rose" as const, seed: 3 },
    { label: zh ? "借出规模" : "Shares on Loan", value: formatCompactStat(sharesOnLoan), sub: zh ? "3个月" : "3 months", delta: `${formatSigned(intelligence.momentumPct)}%`, tone: "blue" as const, seed: 4 },
    { label: zh ? "借券成本" : "Cost to Borrow", value: `${costToBorrow.toFixed(2)}%`, sub: zh ? "3个月" : "3 months", delta: `${formatSigned(costToBorrow - 0.6)}%`, tone: "rose" as const, seed: 5 },
    { label: zh ? "利用率" : "Utilization", value: `${utilization.toFixed(1)}%`, sub: zh ? "3个月" : "3 months", delta: `${formatSigned(utilization - 55)}%`, tone: "blue" as const, seed: 6 }
  ];
  const tabs = zh
    ? ["空头", "流向", "事件", "压力", "DGWM", "下一步"]
    : ["Shorts", "Flow", "Events", "Pressure", "DGWM", "Next Action"];
  const shell = dark
    ? "bg-[#06111f] text-slate-100"
    : "bg-[#f7fbff] text-[#102136]";
  const panel = dark
    ? "border-[#223235] bg-[#0b1414]"
    : "border-[#d9e5f0] bg-white";
  const muted = dark ? "text-slate-400" : "text-[#607188]";
  const line = dark ? "border-[#1e3032]" : "border-[#d9e5f0]";

  return (
    <div className={`h-full min-h-0 overflow-y-auto px-4 py-3 ${shell}`}>
      <div className={`mb-3 flex items-center justify-between border-b pb-2 ${line}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={dark ? "text-blue-300" : "text-[#2563eb]"}>
            <Activity className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-black">{zh ? "交易信号工作台" : "Trading Signals Workbench"}</div>
            <div className={`mt-0.5 truncate font-mono text-[8px] font-black uppercase tracking-[0.18em] ${muted}`}>
              {currentSymbol.id} / {sourceLabel} / {feedState}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tabs.map((tab, index) => (
            <button
              key={tab}
              className={`h-7 rounded border px-3 text-[10px] font-bold transition-colors ${
                index === 0
                  ? dark
                    ? "border-blue-500/40 bg-blue-400/15 text-blue-100"
                    : "border-blue-500/45 bg-blue-50 text-blue-700"
                  : dark
                    ? "border-[#24383b] bg-[#0a1212] text-slate-400"
                    : "border-[#d9e5f0] bg-white text-[#44546a]"
              }`}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} dark={dark} />
        ))}
      </div>

      <div className="mt-3 grid min-h-[300px] grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]">
        <section className={`min-w-0 rounded-md border p-3 ${panel}`}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[13px] font-black">{zh ? "空头压力复合图" : "Short Pressure Composite"}</div>
            <div className={`font-mono text-[8px] font-black uppercase tracking-widest ${muted}`}>
              {formatDeskPrice(currentSymbol.price, currentSymbol.precision)} / MSIR {intelligence.score}
            </div>
          </div>
          <CompositeChart dark={dark} pressure={pressure} utilization={utilization} score={intelligence.score} />
          <div className={`mt-2 grid grid-cols-3 gap-2 border-t pt-2 ${line}`}>
            {["1M", "3M", "6M", "1Y", "YTD", "ALL"].map((range, index) => (
              <button
                key={range}
                type="button"
                className={`h-7 rounded border text-[10px] font-bold ${
                  index === 1
                    ? dark
                      ? "border-blue-500/35 bg-blue-400/15 text-blue-100"
                      : "border-blue-400 bg-blue-50 text-blue-700"
                    : dark
                      ? "border-[#24383b] text-slate-400"
                      : "border-[#d9e5f0] text-[#607188]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </section>

        <aside className="grid min-h-0 grid-rows-[1fr_1fr] gap-3">
          <section className={`rounded-md border p-3 ${panel}`}>
            <PanelTitle title={zh ? "实时空头压力" : "Live Short Pressure"} dark={dark} />
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(130px,0.9fr)] gap-3">
              <div className="space-y-2 text-[11px]">
                <SignalRow label={zh ? "预估空头占比" : "Estimated Short Interest"} value={`${shortInterest.toFixed(2)}%`} dark={dark} />
                <SignalRow label={zh ? "今日借出变化" : "Borrowed Change"} value={formatCompactStat(sharesOnLoan * 0.034)} dark={dark} />
                <SignalRow label={zh ? "借券成本均值" : "Borrow Fee Avg"} value={`${costToBorrow.toFixed(2)}%`} dark={dark} />
                <SignalRow label={zh ? "利用率" : "Utilization"} value={`${utilization.toFixed(1)}%`} dark={dark} />
              </div>
              <MiniLine dark={dark} seed={8} />
            </div>
          </section>

          <section className={`rounded-md border p-3 ${panel}`}>
            <PanelTitle title={zh ? "DGWM 门控" : "DGWM Gate"} dark={dark} />
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(150px,0.65fr)_minmax(0,1fr)]">
              <div>
                <div className={dark ? "rounded border border-amber-400/35 bg-amber-400/10 py-2 text-center font-mono text-[11px] font-black text-amber-300" : "rounded border border-amber-300 bg-amber-50 py-2 text-center font-mono text-[11px] font-black text-amber-700"}>
                  {pressure > 68 ? (zh ? "偏紧" : "TIGHT") : (zh ? "中性" : "NEUTRAL")}
                </div>
                <div className="mt-3 space-y-2 text-[11px]">
                  <GateLine label={zh ? "空头压力" : "Short Pressure"} value={`${pressure.toFixed(0)} / 100`} dark={dark} />
                  <GateLine label={zh ? "流向一致性" : "Flow Alignment"} value={`${Math.max(28, intelligence.score - 18)} / 100`} dark={dark} />
                  <GateLine label={zh ? "事件风险" : "Event Risk"} value={`${Math.min(88, pressure + 5).toFixed(0)} / 100`} dark={dark} />
                </div>
              </div>
              <div className={`rounded border p-3 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className="text-[13px] font-black">{zh ? "下一步动作" : "Next Action"}</div>
                <ul className={`mt-2 space-y-1.5 text-[11px] leading-relaxed ${muted}`}>
                  <li>{zh ? "观察压力变化，等待突破信号" : "Watch pressure shifts and wait for a breakout signal."}</li>
                  <li>{zh ? "关注借券成本与借出规模同步上行" : "Track CTB rising with borrowed supply."}</li>
                  <li>{zh ? "价格有效突破关键位后再交给 DGWM" : "Escalate to DGWM after price clears the key level."}</li>
                </ul>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, delta, tone, seed, dark }: { label: string; value: string; sub: string; delta: string; tone: MetricTone; seed: number; dark: boolean }) {
  const color = toneColor(tone, dark);
  return (
    <div className={`rounded-md border p-3 ${dark ? "border-[#24383b] bg-[#0b1414]" : "border-[#d9e5f0] bg-white"}`}>
      <div className={dark ? "text-[11px] text-slate-300" : "text-[11px] text-[#334155]"}>{label}</div>
      <div className="mt-1 text-[18px] font-black">{value}</div>
      <Sparkline seed={seed} tone={tone} dark={dark} />
      <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
        <span className={dark ? "text-slate-400" : "text-[#607188]"}>{sub}</span>
        <span className={color}>{delta}</span>
      </div>
    </div>
  );
}

function Sparkline({ seed, tone, dark }: { seed: number; tone: MetricTone; dark: boolean }) {
  const stroke = toneHex(tone, dark);
  const points = Array.from({ length: 22 }).map((_, index) => {
    const x = 4 + index * 4.2;
    const y = 27 - (Math.sin((index + seed) * 0.65) * 5 + Math.cos((index * seed) * 0.2) * 3 + 10);
    return `${x},${Math.max(7, Math.min(31, y))}`;
  }).join(" ");
  return (
    <svg className="mt-2 h-10 w-full" viewBox="0 0 96 38" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CompositeChart({ dark, pressure, utilization, score }: { dark: boolean; pressure: number; utilization: number; score: number }) {
  const orangePoints = [35, 42, 39, 48, 44, 52, 66, pressure, 58, 72, 68, 54].map((value, index) => `${index * 8.5},${78 - value * 0.58}`).join(" ");
  const bluePoints = [score, utilization, pressure, 62, 56, 64, 70, 68, 66, 71, 75, 78].map((value, index) => `${index * 8.5},${72 - Math.max(0, Math.min(100, value)) * 0.52}`).join(" ");
  const grid = dark ? "rgba(148,163,184,0.11)" : "rgba(95,118,145,0.16)";
  return (
    <svg className="h-[260px] w-full" viewBox="0 0 100 82" preserveAspectRatio="none" aria-hidden="true">
      {[14, 28, 42, 56, 70].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke={grid} strokeWidth="0.7" />)}
      <polyline points={bluePoints} fill="none" stroke={dark ? "#3b82f6" : "#2563eb"} strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <polyline points={orangePoints} fill="none" stroke="#f59e0b" strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="74" y2="74" stroke={dark ? "#35516a" : "#b8c9df"} strokeWidth="1" />
    </svg>
  );
}

function PanelTitle({ title, dark }: { title: string; dark: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-[13px] font-black">
        {title}
        <Info className={dark ? "h-3 w-3 text-slate-500" : "h-3 w-3 text-[#7c8da3]"} />
      </div>
      <span className={dark ? "text-[10px] text-slate-500" : "text-[10px] text-[#7c8da3]"}>More</span>
    </div>
  );
}

function SignalRow({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={dark ? "text-slate-400" : "text-[#607188]"}>{label}</span>
      <span className={dark ? "font-mono font-bold text-blue-300" : "font-mono font-bold text-[#1d4ed8]"}>{value}</span>
    </div>
  );
}

function GateLine({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <Check className={dark ? "h-3 w-3 text-blue-300" : "h-3 w-3 text-[#2563eb]"} />
        <span className={dark ? "truncate text-slate-400" : "truncate text-[#607188]"}>{label}</span>
      </span>
      <span className={dark ? "font-mono text-slate-300" : "font-mono text-[#334155]"}>{value}</span>
    </div>
  );
}

function MiniLine({ dark, seed }: { dark: boolean; seed: number }) {
  return (
    <div className={`grid place-items-center rounded border ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
      <Sparkline seed={seed} tone="blue" dark={dark} />
    </div>
  );
}

function toneColor(tone: MetricTone, dark: boolean) {
  if (tone === "rose") return dark ? "text-rose-300" : "text-red-600";
  if (tone === "amber") return dark ? "text-amber-300" : "text-amber-700";
  if (tone === "blue") return dark ? "text-blue-300" : "text-blue-700";
  return dark ? "text-blue-300" : "text-[#1d4ed8]";
}

function toneHex(tone: MetricTone, dark: boolean) {
  if (tone === "rose") return dark ? "#fb7185" : "#ef4444";
  if (tone === "amber") return "#f59e0b";
  if (tone === "blue") return dark ? "#60a5fa" : "#2563eb";
  return dark ? "#3b82f6" : "#2563eb";
}
