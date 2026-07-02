import { Activity, Newspaper } from "lucide-react";
import type { Language } from "@shared/translations";
import type { MarketSymbol, NewsItem } from "@shared/types";
import type { IntelEvent } from "./types";
import { eventIconTone, eventTagTone } from "./toneClasses";

export function WarRoomNarrativeList({
  newsItems,
  loading,
  events,
  symbol,
  lang
}: {
  newsItems: NewsItem[];
  loading: boolean;
  events: IntelEvent[];
  symbol: MarketSymbol;
  lang: Language;
}) {
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

export function StrategyEventTape({
  events,
  lang,
  onSymbolSelect
}: {
  events: IntelEvent[];
  lang: Language;
  onSymbolSelect: (symbol: MarketSymbol) => void;
}) {
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

function catalystStarScore(item: NewsItem | null | undefined, index: number, change24h: number) {
  if (!item) return 3;
  let score = 3;
  if (index === 0) score += 1;
  if (item.sentiment !== "neutral") score += 1;
  if (Math.abs(change24h || 0) >= 2) score += 1;
  return Math.max(1, Math.min(5, score));
}
