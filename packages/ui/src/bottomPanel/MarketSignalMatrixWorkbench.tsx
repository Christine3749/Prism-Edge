import { useState } from "react";
import { ArrowUpDown, Layers, Search, Target } from "lucide-react";
import { getBiasLabel } from "@shared/prismIntelligence";
import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { Language } from "@shared/translations";
import { buildMatrixRows, buildTooltip, poolMatches, valueForSort } from "./marketSignalMatrixModel";
import type { MatrixPool, MatrixPrefs, MatrixRowModel } from "./marketSignalMatrixModel";

interface MarketSignalMatrixWorkbenchProps {
  currentSymbol: MarketSymbol;
  symbolsList: MarketSymbol[];
  marketStatus?: MarketDataStatus;
  lang: Language;
  theme: "dark" | "light";
  onSymbolSelect: (symbol: MarketSymbol) => void;
}

const PREF_KEY = "prism_signal_matrix_v1";
const pools: MatrixPool[] = ["all", "crypto", "us", "hk", "cn", "forex"];

export function MarketSignalMatrixWorkbench({
  currentSymbol,
  symbolsList,
  marketStatus,
  lang,
  theme,
  onSymbolSelect
}: MarketSignalMatrixWorkbenchProps) {
  const zh = lang === "zh" || lang === "tc";
  const dark = theme === "dark";
  const [prefs, setPrefs] = useStoredMatrixPrefs();
  const query = prefs.query.trim().toLowerCase();
  const poolLabels: Record<MatrixPool, string> = {
    all: zh ? "全部资产" : "All Assets",
    crypto: "Crypto",
    us: zh ? "美股" : "US",
    hk: zh ? "港股" : "HK",
    cn: zh ? "A股" : "A-Share",
    forex: zh ? "外汇" : "FX"
  };
  const shell = dark ? "bg-[#06111f] text-slate-100" : "bg-[#f7fbff] text-[#102136]";
  const panel = dark ? "border-[#24383b] bg-[#0b1414]" : "border-[#d9e5f0] bg-white";
  const muted = dark ? "text-slate-400" : "text-[#607188]";
  const line = dark ? "border-[#1e3032]" : "border-[#d9e5f0]";
  const rows = buildMatrixRows(symbolsList, currentSymbol, marketStatus, lang)
    .filter((row) => poolMatches(row.symbol, prefs.pool))
    .filter((row) => {
      if (!query) return true;
      return [row.symbol.id, row.symbol.symbol, row.symbol.name, row.symbol.exchange, row.symbol.market]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => valueForSort(b, prefs.sortKey) - valueForSort(a, prefs.sortKey));
  const top = rows[0];
  const selectedRank = rows.findIndex((row) => row.symbol.id === currentSymbol.id) + 1;
  const avgScore = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 0;
  const liveCount = rows.filter((row) => row.feedState === "live").length;

  return (
    <div className={`h-full min-h-0 overflow-y-auto px-4 py-3 ${shell}`}>
      <div className={`mb-3 flex items-center justify-between gap-3 border-b pb-2 ${line}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={dark ? "text-blue-300" : "text-[#2563eb]"}>
            <Layers className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-black">{zh ? "全市场信号矩阵" : "PRISM SIGNAL MATRIX"}</div>
            <div className={`mt-0.5 truncate font-mono text-[9px] font-black uppercase tracking-[0.12em] ${muted}`}>
              {zh ? "筛选 / 排序 / DGWM 门控" : "Screener / Ranking / DGWM Gate"}
            </div>
          </div>
        </div>
        <div className={`hidden shrink-0 items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.12em] lg:flex ${muted}`}>
          <span>{rows.length} {zh ? "资产" : "assets"}</span>
          <span>{liveCount} LIVE</span>
          <span>AVG {avgScore}</span>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)]">
        <aside className={`rounded-md border p-3 ${panel}`}>
          <div className="flex items-center gap-2 text-[13px] font-black">
            <Target className={dark ? "h-4 w-4 text-blue-300" : "h-4 w-4 text-[#2563eb]"} />
            {zh ? "矩阵状态" : "Matrix State"}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatTile label={zh ? "覆盖" : "Coverage"} value={`${rows.length}`} dark={dark} />
            <StatTile label={zh ? "均分" : "Avg Score"} value={`${avgScore}`} dark={dark} />
            <StatTile label={zh ? "当前排名" : "Current Rank"} value={selectedRank > 0 ? `#${selectedRank}` : "--"} dark={dark} />
            <StatTile label="DGWM" value={top ? `${top.dgwm}%` : "--"} dark={dark} />
          </div>
          <div className={`mt-3 rounded border p-3 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
            <div className={`font-mono text-[9px] font-black uppercase tracking-[0.12em] ${muted}`}>{zh ? "当前优先资产" : "Top Candidate"}</div>
            <div className="mt-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[14px] font-black">{top?.symbol.id || "--"}</div>
                <div className={`mt-1 truncate text-[10px] ${muted}`}>{top?.brief.setup || (zh ? "等待资产池" : "Waiting for pool")}</div>
              </div>
              <div className={top ? scoreTone(top.score, dark) : muted}>{top?.score || "--"}</div>
            </div>
          </div>
        </aside>

        <section className={`min-w-0 rounded-md border ${panel}`}>
          <div className={`flex flex-wrap items-center justify-between gap-2 border-b p-3 ${line}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              {pools.map((pool) => (
                <button
                  key={pool}
                  type="button"
                  onClick={() => setPrefs({ ...prefs, pool })}
                  className={`h-7 rounded border px-3 text-[10px] font-bold transition-colors ${prefs.pool === pool ? activeButton(dark) : quietButton(dark)}`}
                >
                  {poolLabels[pool]}
                </button>
              ))}
            </div>
            <label className={`flex h-7 min-w-[190px] items-center gap-2 rounded border px-2 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-white"}`}>
              <Search className={dark ? "h-3.5 w-3.5 text-slate-500" : "h-3.5 w-3.5 text-[#7c8da3]"} />
              <input
                value={prefs.query}
                onChange={(event) => setPrefs({ ...prefs, query: event.target.value })}
                className="min-w-0 flex-1 bg-transparent text-[11px] font-bold outline-none"
                placeholder={zh ? "搜索市场资产..." : "Search assets..."}
              />
            </label>
          </div>

          <div className={`grid grid-cols-[minmax(180px,1.2fr)_80px_86px_86px_86px_120px] border-b px-3 py-2 font-mono text-[9px] font-black uppercase tracking-[0.12em] ${muted} ${line}`}>
            <span>{zh ? "标的 / 数据" : "Symbol / Feed"}</span>
            <SortButton label="Score" active={prefs.sortKey === "score"} onClick={() => setPrefs({ ...prefs, sortKey: "score" })} />
            <SortButton label={zh ? "方向" : "Bias"} />
            <SortButton label={zh ? "压力" : "Pressure"} active={prefs.sortKey === "pressure"} onClick={() => setPrefs({ ...prefs, sortKey: "pressure" })} />
            <SortButton label="DGWM" active={prefs.sortKey === "dgwm"} onClick={() => setPrefs({ ...prefs, sortKey: "dgwm" })} />
            <SortButton label={zh ? "趋势" : "Sparkline"} active={prefs.sortKey === "change"} onClick={() => setPrefs({ ...prefs, sortKey: "change" })} />
          </div>

          <div className="max-h-[430px] overflow-y-auto">
            {rows.map((row, index) => (
              <MatrixRow
                key={row.symbol.id}
                row={row}
                index={index}
                selected={row.symbol.id === currentSymbol.id}
                dark={dark}
                zh={zh}
                lang={lang}
                onSelect={() => onSymbolSelect(row.symbol)}
              />
            ))}
            {rows.length === 0 && (
              <div className={`px-4 py-10 text-center text-[12px] ${muted}`}>{zh ? "没有匹配资产。" : "No matching assets."}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MatrixRow({ row, index, selected, dark, zh, lang, onSelect }: { row: MatrixRowModel; index: number; selected: boolean; dark: boolean; zh: boolean; lang: Language; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={buildTooltip(row, zh)}
      className={`group grid w-full grid-cols-[minmax(180px,1.2fr)_80px_86px_86px_86px_120px] items-center border-b px-3 py-2 text-left transition-colors ${selected ? (dark ? "border-blue-400/25 bg-blue-400/10" : "border-blue-300 bg-blue-50") : (dark ? "border-[#13263d] hover:bg-[#0d1b2e]" : "border-[#e3ebf3] hover:bg-[#f2f7fb]")}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="w-5 shrink-0 font-mono text-[10px] font-black text-slate-500">{index + 1}</span>
          <span className="truncate text-[12px] font-black">{row.symbol.id}</span>
          <span className={feedClass(row.feedState, dark)}>{row.feedState.toUpperCase()}</span>
        </div>
        <div className={dark ? "mt-0.5 truncate text-[9px] text-slate-500" : "mt-0.5 truncate text-[9px] text-[#607188]"}>{row.symbol.name} · {row.symbol.exchange || row.symbol.market || row.symbol.type}</div>
      </div>
      <div className={`font-mono text-[18px] font-black ${scoreTone(row.score, dark)}`}>{row.score}</div>
      <div>
        <div className={biasTone(row.bias, dark)}>{getBiasLabel(row.bias, lang)}</div>
        <div className={dark ? "mt-0.5 text-[8px] text-slate-500" : "mt-0.5 text-[8px] text-[#7c8da3]"}>{row.brief.setup}</div>
      </div>
      <Meter value={row.pressure} dark={dark} tone="amber" />
      <Meter value={row.dgwm} dark={dark} tone="blue" />
      <MiniSparkline seed={index + row.score} up={row.symbol.change24h >= 0} dark={dark} change={row.symbol.change24h} />
    </button>
  );
}

function useStoredMatrixPrefs(): [MatrixPrefs, (next: MatrixPrefs) => void] {
  const fallback: MatrixPrefs = { pool: "all", sortKey: "score", query: "" };
  const [prefs, setPrefsState] = useState<MatrixPrefs>(() => {
    if (typeof window === "undefined") return fallback;
    try {
      return { ...fallback, ...JSON.parse(window.localStorage.getItem(PREF_KEY) || "{}") };
    } catch {
      return fallback;
    }
  });
  const setPrefs = (next: MatrixPrefs) => {
    setPrefsState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(PREF_KEY, JSON.stringify(next));
  };
  return [prefs, setPrefs];
}
function SortButton({ label, active = false, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1 text-left ${active ? "text-blue-400" : ""}`}>
      {label}
      {onClick && <ArrowUpDown className="h-3 w-3" />}
    </button>
  );
}

function StatTile({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded border px-2 py-2 ${dark ? "border-[#24383b] bg-[#081111]" : "border-[#d9e5f0] bg-[#fbfdff]"}`}>
      <div className={dark ? "font-mono text-[8px] font-black uppercase tracking-widest text-slate-500" : "font-mono text-[8px] font-black uppercase tracking-widest text-[#7c8da3]"}>{label}</div>
      <div className="mt-1 font-mono text-[16px] font-black">{value}</div>
    </div>
  );
}

function Meter({ value, dark, tone }: { value: number; dark: boolean; tone: "blue" | "amber" }) {
  const color = tone === "blue" ? (dark ? "bg-blue-300" : "bg-[#2563eb]") : "bg-amber-400";
  return (
    <div className="pr-3">
      <div className="mb-1 font-mono text-[11px] font-black">{value}</div>
      <div className={dark ? "h-1.5 rounded bg-[#102023]" : "h-1.5 rounded bg-[#dce8f1]"}>
        <div className={`h-full rounded ${color}`} style={{ width: `${Math.max(6, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function MiniSparkline({ seed, up, dark, change }: { seed: number; up: boolean; dark: boolean; change: number }) {
  const stroke = up ? (dark ? "#3b82f6" : "#2563eb") : (dark ? "#fb7185" : "#ef4444");
  const points = Array.from({ length: 18 }).map((_, index) => {
    const x = 3 + index * 5.2;
    const trend = up ? -index * 0.35 : index * 0.34;
    const wave = Math.sin((index + seed) * 0.7) * 5;
    return `${x},${22 + trend + wave}`;
  }).join(" ");
  return (
    <div className="flex items-center gap-2">
      <svg className="h-8 min-w-0 flex-1" viewBox="0 0 96 42" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
      </svg>
      <span className={`w-10 text-right font-mono text-[10px] font-black ${up ? (dark ? "text-blue-300" : "text-[#1d4ed8]") : "text-rose-500"}`}>{change >= 0 ? "+" : ""}{change.toFixed(1)}%</span>
    </div>
  );
}

function activeButton(dark: boolean) {
  return dark ? "border-blue-500/40 bg-blue-400/15 text-blue-100" : "border-blue-500/45 bg-blue-50 text-blue-700";
}

function quietButton(dark: boolean) {
  return dark ? "border-[#24383b] bg-[#0a1212] text-slate-400" : "border-[#d9e5f0] bg-white text-[#44546a]";
}

function scoreTone(score: number, dark: boolean) {
  if (score >= 82) return dark ? "text-emerald-300" : "text-emerald-700";
  if (score >= 68) return dark ? "text-blue-300" : "text-[#1d4ed8]";
  if (score >= 52) return dark ? "text-amber-300" : "text-amber-700";
  return dark ? "text-rose-300" : "text-red-600";
}

function biasTone(bias: MatrixRowModel["bias"], dark: boolean) {
  if (bias === "long") return dark ? "text-emerald-300 text-[11px] font-black" : "text-emerald-700 text-[11px] font-black";
  if (bias === "short") return dark ? "text-rose-300 text-[11px] font-black" : "text-red-600 text-[11px] font-black";
  if (bias === "defense") return dark ? "text-amber-300 text-[11px] font-black" : "text-amber-700 text-[11px] font-black";
  return dark ? "text-slate-300 text-[11px] font-black" : "text-[#44546a] text-[11px] font-black";
}

function feedClass(state: MarketDataStatus["state"], dark: boolean) {
  if (state === "live") return dark ? "rounded border border-emerald-400/25 px-1 py-[1px] font-mono text-[7px] font-black text-emerald-300" : "rounded border border-emerald-400/35 px-1 py-[1px] font-mono text-[7px] font-black text-emerald-700";
  if (state === "delayed") return dark ? "rounded border border-blue-400/20 px-1 py-[1px] font-mono text-[7px] font-black text-blue-300" : "rounded border border-blue-300 px-1 py-[1px] font-mono text-[7px] font-black text-blue-700";
  return dark ? "rounded border border-slate-700 px-1 py-[1px] font-mono text-[7px] font-black text-slate-500" : "rounded border border-slate-300 px-1 py-[1px] font-mono text-[7px] font-black text-slate-500";
}
