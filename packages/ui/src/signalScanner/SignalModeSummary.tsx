import { Activity, Gauge, ShieldCheck, TrendingUp } from "lucide-react";
import { MetricPill } from "./MetricPill";
import type { IntelStats, SignalScannerProps, StrategyLens, StrategySuggestion } from "./types";

export function SignalModeSummary({
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
