import { Target } from "lucide-react";
import type { PrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { clampPercent, formatCompactStat, formatDeskPrice, formatSigned } from "./formatters";
import { WarRoomMetricCell } from "./PrimitiveCells";

interface FundamentalSnapshotProps {
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
}

export function WarRoomFundamentalSnapshot({
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
}: FundamentalSnapshotProps) {
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
      "此模块对应参考图里的 Company Highlights：用于把基本面摘要、区间位置和右侧核心指标压到同一屏。"
    ]
    : [
      `${currentSymbol.name} is staged around ${brief.setup}; MSIR ${intelligence.score} and bias is ${brief.bias}.`,
      `Volume proxy reads ${intelligence.volumeRatio.toFixed(1)}x, drawdown pressure is ${formatSigned(intelligence.drawdownPct)}%, and liquidity confirmation remains the next check.`,
      "This mirrors the Company Highlights panel: thesis text, range position, and key stats in one work surface."
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
