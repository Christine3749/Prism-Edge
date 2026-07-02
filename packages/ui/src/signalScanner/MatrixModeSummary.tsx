import { Activity, Layers, Search, Target } from "lucide-react";
import { buildPrismIntelligence, getBiasLabel } from "@shared/prismIntelligence";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";

interface MatrixModeSummaryProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  lang: Language;
  theme: "dark" | "light";
}

export function MatrixModeSummary({ currentSymbol, symbolsList, marketStatus, lang, theme }: MatrixModeSummaryProps) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const rows = [currentSymbol, ...symbolsList.filter((symbol) => symbol.id !== currentSymbol.id)].map((symbol) => {
    const selected = symbol.id === currentSymbol.id;
    const intelligence = buildPrismIntelligence(symbol, [], selected ? marketStatus : undefined);
    const pressure = clamp(42 + Math.abs(intelligence.drawdownPct) * 2.8 + intelligence.volatilityPct * 4 + (100 - intelligence.score) * 0.18, 8, 96);
    return { symbol, intelligence, pressure: Math.round(pressure) };
  }).sort((a, b) => b.intelligence.score - a.intelligence.score);
  const selectedRank = rows.findIndex((row) => row.symbol.id === currentSymbol.id) + 1;
  const top = rows[0];
  const avgScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.intelligence.score, 0) / rows.length) : 0;
  const liveCount = rows.filter((row) => row.symbol.lastDataState === "live" || row.symbol.dataProvider === "binance").length;
  const currentIntel = buildPrismIntelligence(currentSymbol, [], marketStatus);
  const source = marketStatus?.source || currentSymbol.lastSource || currentSymbol.dataProvider || currentSymbol.exchange || "gateway";
  const feedState = marketStatus?.state || currentSymbol.lastDataState || "feed";

  return (
    <div className={`flex h-full min-h-0 flex-col shadow-[18px_0_44px_rgba(0,12,18,0.28)] ${dark ? "border-r border-white/10 bg-[#07111f] text-slate-200" : "border-r border-[#d9e5f0] bg-[#f7fbff] text-[#102136]"}`}>
      <div className={`border-b px-3 py-3 ${dark ? "border-white/10 bg-[#0a1626]" : "border-[#d9e5f0] bg-white"}`}>
        <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
          <Activity className="h-3.5 w-3.5" />
          {zh ? "III / 矩阵模式" : "III / Matrix Mode"}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={`truncate text-[15px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{zh ? "全市场信号矩阵" : "Signal Matrix"}</div>
            <div className="mt-1 truncate font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">{source} / {feedState}</div>
          </div>
          <div className={`shrink-0 text-right font-mono ${scoreTone(avgScore, dark)}`}>
            <div className="text-[28px] font-black leading-none">{avgScore}</div>
            <div className="mt-1 text-[7px] font-black uppercase tracking-widest text-slate-500">AVG</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className={`border p-3 ${panelTone(dark)}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-blue-200" : "text-blue-700"}`}>
            <Layers className="h-3.5 w-3.5" />
            {zh ? "矩阵摘要" : "Matrix Summary"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[8px] font-black uppercase tracking-widest">
            <MetricPill label={zh ? "覆盖" : "Assets"} value={`${rows.length}`} dark={dark} />
            <MetricPill label="LIVE" value={`${liveCount}`} dark={dark} />
            <MetricPill label={zh ? "当前排名" : "Rank"} value={selectedRank > 0 ? `#${selectedRank}` : "--"} dark={dark} />
            <MetricPill label="DGWM" value={`${currentIntel.confidencePct}%`} dark={dark} />
          </div>
        </section>

        <section className={`mt-3 border p-3 ${panelTone(dark)}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-slate-400" : "text-slate-600"}`}>
            <Target className="h-3.5 w-3.5" />
            {zh ? "当前标的" : "Selected Asset"}
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className={`truncate text-[14px] font-black ${dark ? "text-white" : "text-[#102136]"}`}>{currentSymbol.id}</div>
              <div className={dark ? "mt-1 truncate text-[10px] text-slate-500" : "mt-1 truncate text-[10px] text-[#607188]"}>{getBiasLabel(currentIntel.bias, lang)} / {currentIntel.risk}</div>
            </div>
            <div className={`font-mono text-[24px] font-black leading-none ${scoreTone(currentIntel.score, dark)}`}>{currentIntel.score}</div>
          </div>
        </section>

        <section className={`mt-3 border p-3 ${panelTone(dark)}`}>
          <div className={`flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] ${dark ? "text-amber-300" : "text-amber-700"}`}>
            <Search className="h-3.5 w-3.5" />
            {zh ? "优先候选" : "Top Candidate"}
          </div>
          <div className="mt-2 space-y-2">
            {rows.slice(0, 4).map((row, index) => (
              <div key={row.symbol.id} className={`grid grid-cols-[20px_minmax(0,1fr)_42px] items-center gap-2 border px-2 py-2 ${dark ? "border-white/10 bg-[#06101d]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
                <div className="font-mono text-[9px] font-black text-slate-500">{index + 1}</div>
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-black">{row.symbol.id}</div>
                  <div className={dark ? "mt-0.5 truncate text-[8px] text-slate-500" : "mt-0.5 truncate text-[8px] text-[#607188]"}>{getBiasLabel(row.intelligence.bias, lang)} / P {row.pressure}</div>
                </div>
                <div className={`text-right font-mono text-[13px] font-black ${scoreTone(row.intelligence.score, dark)}`}>{row.intelligence.score}</div>
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

function panelTone(dark: boolean) {
  return dark ? "border-white/10 bg-[#091827]" : "border-[#d9e5f0] bg-white";
}

function scoreTone(score: number, dark: boolean) {
  if (score >= 82) return dark ? "text-emerald-300" : "text-emerald-700";
  if (score >= 68) return dark ? "text-blue-300" : "text-[#1d4ed8]";
  if (score >= 52) return dark ? "text-amber-300" : "text-amber-700";
  return dark ? "text-rose-300" : "text-red-600";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}