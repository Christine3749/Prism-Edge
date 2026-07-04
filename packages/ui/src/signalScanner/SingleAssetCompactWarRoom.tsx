import { Activity, Gauge, Target, TrendingUp } from "lucide-react";
import { buildPrismIntelligence, describePrismIntelligence } from "@shared/prismIntelligence";
import type { AnalysisRunResponse, MarketDataStatus, MarketSymbol, NewsItem } from "@shared/types";
import type { Language } from "@shared/translations";
import { clampPercent, formatCompactStat, formatDeskPrice, formatSigned } from "./formatters";
import type { IntelEvent } from "./types";

interface SingleAssetCompactWarRoomProps {
  currentSymbol: MarketSymbol;
  events: IntelEvent[];
  newsItems: NewsItem[];
  newsLoading: boolean;
  marketStatus?: MarketDataStatus;
  analysisResult?: AnalysisRunResponse | null;
  lang: Language;
}

export function SingleAssetCompactWarRoom({
  currentSymbol,
  events,
  newsItems,
  newsLoading,
  marketStatus,
  analysisResult,
  lang
}: SingleAssetCompactWarRoomProps) {
  const zh = lang === "zh" || lang === "tc";
  const intelligence = buildPrismIntelligence(currentSymbol, [], marketStatus, analysisResult);
  const brief = describePrismIntelligence(intelligence, currentSymbol, lang);
  const sourceLabel = marketStatus?.provider || marketStatus?.source || currentSymbol.dataProvider || currentSymbol.lastSource || currentSymbol.exchange || "gateway";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "local";
  const priceText = formatDeskPrice(currentSymbol.price, currentSymbol.precision);
  const daySpread = Math.min(8, Math.max(0.8, (intelligence.volatilityPct || Math.abs(currentSymbol.change24h) || 1.2) * 0.72));
  const dayLow = currentSymbol.price * (1 - daySpread / 100);
  const dayHigh = currentSymbol.price * (1 + daySpread / 100);
  const dayPosition = clampPercent(50 + currentSymbol.change24h * 8);
  const status = intelligence.score >= 68
    ? (zh ? "可推进" : "Advance")
    : intelligence.score >= 52
      ? (zh ? "等待确认" : "Wait")
      : (zh ? "降优先级" : "Lower");
  const statusTone = intelligence.score >= 68 ? "text-emerald-300" : intelligence.score >= 52 ? "text-amber-300" : "text-rose-300";
  const latestItems = newsItems.length > 0
    ? newsItems.slice(0, 2).map((item) => ({
      id: item.id,
      title: item.title,
      meta: `${item.source} / ${item.time}`
    }))
    : events.slice(0, 2).map((item) => ({ id: item.id, title: item.title, meta: item.meta }));
  while (latestItems.length < 2) {
    latestItems.push({
      id: `compact-placeholder-${latestItems.length}`,
      title: newsLoading ? (zh ? "正在同步事件材料" : "Syncing event tape") : (zh ? "等待新的材料事件" : "Awaiting material event"),
      meta: "PRISM SENTINEL"
    });
  }

  return (
    <>
      <div className="border-b border-[#12324a] bg-[#000814]">
        <div className="flex h-9 items-center justify-between gap-2 overflow-hidden px-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-blue-300/75">
              <Target className="h-3 w-3" />
              <span>{zh ? "I / 单资产作战" : "I / Single Asset"}</span>
            </div>
          </div>
          <div className="shrink-0 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">
            {sourceLabel} / {feedState}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#000814] p-3" style={{ backgroundImage: "linear-gradient(rgba(54,96,130,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(54,96,130,0.04) 1px, transparent 1px)", backgroundSize: "22px 22px, 22px 22px" }}>
        <section className="border border-[#12324a] bg-[#031426]/86 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[17px] font-black leading-none text-slate-100">{currentSymbol.id}</div>
              <div className="mt-1 font-mono text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                {currentSymbol.exchange || sourceLabel} / {currentSymbol.type || "asset"}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`text-[24px] font-black leading-none ${statusTone}`}>{intelligence.score}</div>
              <div className="mt-1 font-mono text-[7px] font-black uppercase tracking-widest text-slate-500">MSIR</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <CompactMetric label={zh ? "价格" : "Price"} value={priceText} sub={`${formatSigned(currentSymbol.change24h)}%`} tone={currentSymbol.change24h >= 0 ? "text-emerald-300" : "text-rose-300"} />
            <CompactMetric label={zh ? "状态" : "State"} value={status} sub={brief.risk} tone={statusTone} />
            <CompactMetric label={zh ? "可信" : "Trust"} value={`${intelligence.confidencePct}%`} sub="DGWM" tone="text-emerald-300" />
            <CompactMetric label={zh ? "成交量" : "Volume"} value={currentSymbol.volume24h > 0 ? formatCompactStat(currentSymbol.volume24h) : `${intelligence.volumeRatio.toFixed(1)}x`} sub={zh ? "流动性" : "Liquidity"} tone="text-blue-300/80" />
          </div>
        </section>

        <section className="mt-3 border border-[#12324a] bg-[#020b18] p-3">
          <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-blue-300/75">
            <Gauge className="h-3 w-3" />
            {zh ? "今日区间" : "Day Range"}
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between font-mono text-[7px] font-black uppercase tracking-[0.12em] text-slate-500">
              <span>{formatDeskPrice(dayLow, currentSymbol.precision)}</span>
              <span>{formatDeskPrice(dayHigh, currentSymbol.precision)}</span>
            </div>
            <div className="relative mt-1 h-2 bg-[#000814] shadow-[inset_0_0_0_1px_rgba(18,50,74,0.82)]">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-400/80 via-slate-500/70 to-cyan-300/90" />
              <div className="absolute -top-1 h-4 w-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ left: `${dayPosition}%` }} />
            </div>
          </div>
        </section>

        <section className="mt-3 border border-[#12324a] bg-[#020b18] p-3">
          <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-blue-300/75">
            <Activity className="h-3 w-3" />
            {zh ? "作战摘要" : "Thesis Brief"}
          </div>
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-300">
            {zh
              ? `${currentSymbol.name} 围绕 ${brief.setup} 展开，当前先看关键流动性区域是否守住。`
              : `${currentSymbol.name} is staged around ${brief.setup}; liquidity confirmation is the next check.`}
          </p>
          <div className="mt-3 space-y-2">
            {latestItems.map((item) => (
              <div key={item.id} className="border-l border-blue-400/40 pl-2">
                <div className="line-clamp-1 text-[10px] font-black text-slate-200">{item.title}</div>
                <div className="mt-0.5 truncate font-mono text-[7px] uppercase tracking-wider text-slate-600">{item.meta}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 border border-[#12324a] bg-[#061a2b] p-3">
          <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.18em] text-blue-300/75">
            <TrendingUp className="h-3 w-3" />
            {zh ? "作战室职责" : "War Room Role"}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            {zh
              ? "小屏只保留当前标的摘要；完整新闻、订单压力和执行链交给底部工作台。"
              : "The compact rail keeps the current asset brief; full news, order pressure, and execution detail live in the workbench."}
          </p>
        </section>
      </div>
    </>
  );
}

function CompactMetric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="min-w-0 border border-[#12324a] bg-[#000814] px-2.5 py-2">
      <div className="truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[12px] font-black ${tone}`}>{value}</div>
      <div className="mt-0.5 truncate font-mono text-[7px] font-black uppercase tracking-wider text-slate-500">{sub}</div>
    </div>
  );
}
