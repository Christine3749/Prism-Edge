import type { ReactNode } from "react";

export function StripMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 rounded border border-[#12324a] bg-[#031426]/72 px-2 py-2">
      <div className="truncate text-[7px] font-black uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 truncate font-mono text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

export function DashboardStripTile({ label, value, sub, tone, children }: { label: string; value: string; sub: string; tone: string; children: ReactNode }) {
  return (
    <div className="flex min-w-[132px] flex-col justify-between border-l border-[#12324a] bg-[#000814]/92 p-3">
      <div className="min-w-0">
        <div className="truncate text-[7px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</div>
        <div className={`mt-1 truncate font-mono text-[15px] font-black ${tone}`}>{value}</div>
        <div className="mt-0.5 truncate text-[8px] text-slate-500">{sub}</div>
      </div>
      <div className="mt-2 min-h-8">{children}</div>
    </div>
  );
}

export function MiniMeter({ value }: { value: number }) {
  const width = Math.max(4, Math.min(100, value));
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#031426]">
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#3b6f91,#6f8fa8)] shadow-[0_0_14px_rgba(54,96,130,0.28)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function MiniBars({ values, tone }: { values: number[]; tone: "cyan" | "emerald" }) {
  const color = tone === "emerald" ? "bg-emerald-300" : "bg-blue-500/25";
  return (
    <div className="flex h-8 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`w-3 rounded-sm ${color} opacity-80`}
          style={{ height: `${Math.max(12, Math.min(100, value))}%` }}
        />
      ))}
    </div>
  );
}

export function MiniLine({ values }: { values: number[] }) {
  const points = values
    .map((value, index) => `${(index / Math.max(1, values.length - 1)) * 100},${34 - (Math.max(0, Math.min(100, value)) / 100) * 30}`)
    .join(" ");
  return (
    <svg className="h-8 w-full overflow-visible" viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#3b6f91" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="30" x2="100" y2="30" stroke="#12324a" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function MiniRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(#3b6f91 ${clamped * 3.6}deg, rgba(15,23,42,0.9) 0deg)` }}
      >
        <div className="grid h-5 w-5 place-items-center rounded-full bg-[#000814] text-[7px] font-black text-blue-200/75">{Math.round(clamped)}</div>
      </div>
      <MiniMeter value={value} />
    </div>
  );
}