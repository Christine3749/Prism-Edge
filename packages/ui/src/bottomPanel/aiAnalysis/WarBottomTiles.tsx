import type { ReactNode } from "react";
import { WarBottomScore } from "./WarBottomVisuals";

function WarBottomHeader({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="war-bottom-card-header pointer-events-none flex h-3.5 min-w-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap opacity-[0.65]">
      <span className="min-w-0 truncate font-mono text-[6.5px] font-black uppercase leading-none tracking-[0.14em] text-slate-600">{label}</span>
      <span className={`shrink-0 font-mono text-[6.5px] font-black uppercase leading-none tracking-[0.06em] ${tone}`}>{value}</span>
      <span className="min-w-0 truncate text-[6.5px] font-semibold leading-none text-slate-600">{sub}</span>
    </div>
  );
}

export function WarBottomTile({ label, value, sub, tone, children, wide = false }: { label: string; value: string; sub: string; tone: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`war-bottom-tile relative ${wide ? "min-w-[156px]" : "min-w-[132px]"} flex-1 overflow-hidden border-r border-[#172434] bg-[#050a11] px-2 py-1`}>
      <div className="war-bottom-label-row absolute left-2 right-2 top-1 z-10">
        <WarBottomHeader label={label} value={value} sub={sub} tone={tone} />
      </div>
      <div className="war-bottom-visual absolute inset-x-2 bottom-0.5 top-3 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function WarBottomAnalystTile({ value }: { value: number }) {
  const active = value >= 62 ? "raise" : value <= 38 ? "lower" : "hold";
  const changeCount = Math.max(0, Math.round(Math.abs(value - 50) / 18));
  const label = active === "raise" ? "RAISE" : active === "lower" ? "LOWER" : "NO CHG";
  const tone = active === "raise" ? "text-emerald-300" : active === "lower" ? "text-rose-300" : "text-slate-200/85";
  return (
    <div className="war-bottom-tile war-bottom-analyst-tile relative min-w-[156px] flex-1 overflow-hidden border-r border-[#172434] bg-[#050a11] px-2 py-1">
      <div className="war-bottom-label-row absolute left-2 right-2 top-1 z-10">
        <WarBottomHeader label="ANALYSTS" value={label} sub={`${changeCount} chg`} tone={tone} />
      </div>
      <div className="war-bottom-visual absolute inset-x-2 bottom-0.5 top-3 flex flex-col items-center justify-center font-mono">
        <div className="flex items-center justify-center gap-1.5 opacity-80">
          <span className={`rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${active === "raise" ? "border-emerald-300/45 bg-emerald-300/[0.09] text-emerald-200" : "border-emerald-300/20 bg-transparent text-emerald-300/45"}`}>RAISE</span>
          <span className={`rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${active === "lower" ? "border-rose-300/45 bg-rose-300/[0.09] text-rose-200" : "border-rose-300/20 bg-transparent text-rose-300/45"}`}>LOWER</span>
          <span className={`rounded-full border px-2 py-0.5 text-[6.5px] font-black uppercase tracking-[0.08em] ${active === "hold" ? "border-slate-200/45 bg-slate-200/[0.07] text-slate-100/75" : "border-slate-500/20 bg-transparent text-slate-600"}`}>NO CHG</span>
        </div>
        <div className="mt-2 text-center text-[8px] font-black uppercase leading-tight tracking-[0.08em] text-slate-400/70">ANALYST CHANGES</div>
        <div className="mt-1.5 flex items-center justify-center gap-3 text-[8px] opacity-80">
          <span className={active === "lower" ? "text-rose-300" : "text-rose-300/28"}>●</span>
          <span className={active === "lower" ? "text-rose-300" : "text-rose-300/28"}>●</span>
          <span className={active === "raise" ? "text-cyan-300" : "text-cyan-300/28"}>●</span>
          <span className={active === "raise" ? "text-emerald-300" : "text-emerald-300/28"}>●</span>
        </div>
      </div>
    </div>
  );
}
export function WarBottomScoreTile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="war-bottom-tile war-bottom-score-tile relative min-w-[156px] flex-1 overflow-hidden border-r border-[#172434] bg-[#050a11] px-2 py-1">
      <div className="war-bottom-label-row absolute left-2 right-2 top-1 z-10">
        <WarBottomHeader label={label} value={`${Math.round(value)}`} sub={sub} tone="text-blue-100/75" />
      </div>
      <div className="war-bottom-visual absolute inset-x-2 bottom-0.5 top-3 flex items-center justify-center">
        <WarBottomScore value={value} />
      </div>
    </div>
  );
}