export function WarBottomMeter({ value, tone, compact = false }: { value: number; tone: "cyan" | "emerald" | "amber" | "rose"; compact?: boolean }) {
  const width = Math.max(4, Math.min(100, value));
  const fill = {
    cyan: "bg-blue-500/25",
    emerald: "bg-emerald-300",
    amber: "bg-amber-300",
    rose: "bg-rose-300"
  }[tone];
  return (
    <div className={compact ? "mt-1 w-full" : "w-full"}>
      <div className="h-1.5 bg-[#070d16]">
        <div className={`h-full ${fill}`} style={{ width: `${width}%` }} />
      </div>
      {!compact && (
        <div className="mt-1 flex justify-between font-mono text-[7px] font-black uppercase tracking-widest text-slate-700">
          <span>LOW</span>
          <span>{Math.round(width)}</span>
        </div>
      )}
    </div>
  );
}

export function WarBottomBars({ values, tone }: { values: number[]; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const color = {
    cyan: "bg-blue-500/25",
    emerald: "bg-emerald-300",
    amber: "bg-amber-300",
    rose: "bg-rose-300"
  }[tone];
  return (
    <div className="war-bottom-bars flex h-16 w-full items-end justify-center gap-1.5" data-war-bars-tone={tone}>
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`war-bottom-bar w-3 ${color} opacity-85`}
          style={{ height: `${Math.max(12, Math.min(100, value))}%` }}
        />
      ))}
    </div>
  );
}

export function WarBottomLevelTrack({ value, tone }: { value: number; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const clamped = Math.max(4, Math.min(96, value));
  const wave = buildWarBottomWave(clamped, clamped * 0.031, 38);
  return <WarBottomSparkline values={wave} tone={tone} marker={clamped} right={`${Math.round(clamped)}`} />;
}

export function WarBottomRangeTrack({ value, marker, tone }: { value: number; marker: number; tone: "cyan" | "emerald" | "amber" | "rose" }) {
  const clamped = Math.max(4, Math.min(96, value));
  const markerX = Math.max(4, Math.min(96, marker));
  const wave = buildWarBottomWave(clamped, markerX * 0.027, 34);
  return <WarBottomSparkline values={wave} tone={tone} marker={markerX} right="HIGH" />;
}

export function WarBottomSparkline({ values, tone, marker, right = "HIGH" }: { values: number[]; tone: "cyan" | "emerald" | "amber" | "rose"; marker?: number; right?: string }) {
  const stroke = {
    cyan: "#46779a",
    emerald: "#6ee7b7",
    amber: "#facc15",
    rose: "#fb7185"
  }[tone];
  const fill = {
    cyan: "rgba(70,119,154,0.11)",
    emerald: "rgba(110,231,183,0.12)",
    amber: "rgba(250,204,21,0.11)",
    rose: "rgba(251,113,133,0.11)"
  }[tone];
  const clampedValues = values.map((value) => Math.max(4, Math.min(96, value)));
  const linePath = buildWarBottomCurve(clampedValues, 100, 40);
  const areaPath = `${linePath} L 100 39 L 0 39 Z`;
  const markerX = marker === undefined ? null : Math.max(4, Math.min(96, marker));

  return (
    <div className="war-bottom-sparkline w-full px-0.5">
      <svg className="war-bottom-sparkline-svg h-16 w-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 31.5 H100" stroke="#1c2b3d" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        <path d="M0 20.5 H100" stroke="#111c2a" strokeWidth="0.45" vectorEffect="non-scaling-stroke" />
        <path d={areaPath} fill={fill} />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.12" vectorEffect="non-scaling-stroke" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {markerX !== null && <path d={`M ${markerX} 7 V 36`} stroke="#e5e7eb" strokeWidth="0.8" opacity="0.78" vectorEffect="non-scaling-stroke" />}
      </svg>
      <WarBottomSmallText left="LOW" right={right} />
    </div>
  );
}

function buildWarBottomWave(target: number, phase: number, start = 36) {
  const count = 13;
  return Array.from({ length: count }, (_, index) => {
    const t = index / (count - 1);
    const trend = start + (target - start) * t;
    const wave = Math.sin(t * Math.PI * 2.45 + phase) * 7.2 + Math.sin(t * Math.PI * 5.1 + phase * 0.7) * 2.4;
    return Math.max(8, Math.min(92, trend + wave));
  });
}

function buildWarBottomCurve(values: number[], width: number, height: number) {
  if (values.length === 0) return `M 0 ${height / 2}`;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 4 - (value / 100) * (height - 9);
    return { x, y };
  });
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] || current;
    const after = points[index + 2] || next;
    const tension = 0.18;
    const cp1x = current.x + (next.x - previous.x) * tension;
    const cp1y = current.y + (next.y - previous.y) * tension;
    const cp2x = next.x - (after.x - current.x) * tension;
    const cp2y = next.y - (after.y - current.y) * tension;
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }
  return path;
}
export function WarBottomScore({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const activeLength = clamped * 0.72;
  return (
    <svg className="war-bottom-score-gauge h-[104px] w-[146px] overflow-visible" viewBox="0 0 120 94" aria-hidden="true">
      <circle
        cx="60"
        cy="54"
        r="35"
        fill="none"
        stroke="#102033"
        strokeWidth="14"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="72 100"
        strokeDashoffset="14"
        transform="rotate(126 60 54)"
      />
      <circle
        cx="60"
        cy="54"
        r="35"
        fill="none"
        stroke="#56d8d5"
        strokeWidth="14"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray={`${activeLength} 100`}
        strokeDashoffset="14"
        transform="rotate(126 60 54)"
        opacity="0.9"
        style={{ filter: "drop-shadow(0 0 8px rgba(86,216,213,0.35))" }}
      />
      <text x="60" y="61" textAnchor="middle" className="fill-blue-100/80 font-mono text-[20px] font-black">{Math.round(clamped)}</text>
    </svg>
  );
}

export function WarBottomPills({ items, active }: { items: string[]; active: number }) {
  return (
    <div className="flex w-full items-center justify-center gap-1">
      {items.map((item, index) => (
        <span
          key={item}
          className={`min-w-[32px] border px-1.5 py-0.5 text-center font-mono text-[7px] font-black uppercase tracking-wider ${index === active ? "border-blue-300/35 bg-blue-300/[0.11] text-blue-100/80" : "border-[#152638] bg-transparent text-slate-600"}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export function WarBottomInsiderSignal({ value }: { value: number }) {
  const marker = Math.max(8, Math.min(92, value));
  const positive = value >= 55;
  return (
    <div className="w-full space-y-2.5 font-mono">
      <div className="flex items-center justify-center gap-4">
        <span className="rounded-full border border-rose-400/35 bg-rose-400/[0.06] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-rose-300/75">NET SALE</span>
        <span className={`rounded-full border px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] ${positive ? "border-emerald-300/35 bg-emerald-300/[0.08] text-emerald-200/85" : "border-blue-300/25 bg-blue-300/[0.05] text-blue-200/65"}`}>HOLD</span>
      </div>
      <div>
        <div className="mb-1 text-[6px] font-black uppercase tracking-[0.14em] text-slate-600/80">INSIDER MOMENTUM</div>
        <div className="relative h-3 bg-gradient-to-r from-rose-400/65 via-slate-600/45 to-cyan-300/75 shadow-[0_0_10px_rgba(71,119,154,0.12)]">
          <span className="absolute top-1/2 h-7 w-px -translate-y-1/2 bg-slate-100/90" style={{ left: `${marker}%` }} />
        </div>
      </div>
    </div>
  );
}

export function WarBottomAnalystDots({ value }: { value: number }) {
  const up = value >= 55;
  const down = value <= 42;
  return (
    <div className="mt-2 w-full text-center font-mono">
      <div className="flex items-center justify-center gap-2 text-[9px] font-black">
        <span className={down ? "text-rose-300" : "text-slate-700"}>●</span>
        <span className={up ? "text-blue-300/70" : "text-slate-700"}>●</span>
        <span className={up ? "text-emerald-300" : "text-slate-700"}>●</span>
      </div>
      <div className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-slate-600">ANALYST CHANGES</div>
    </div>
  );
}

export function WarBottomStars({ value }: { value: number }) {
  const stars = Math.max(1, Math.min(5, Math.round(value / 20)));
  return (
    <div className="space-y-1">
      <div className="font-mono text-[11px] tracking-[0.08em]">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className={index < stars ? "text-amber-300" : "text-slate-700"}>★</span>
        ))}
      </div>
      <WarBottomMeter value={value} tone={value >= 68 ? "emerald" : "cyan"} compact />
    </div>
  );
}

export function WarBottomSmallText({ left, right }: { left: string; right: string }) {
  return (
    <div className="mt-0.5 flex items-center justify-between gap-2 font-mono text-[6px] font-black uppercase tracking-widest text-slate-700/80">
      <span className="truncate">{left}</span>
      <span className="truncate text-right">{right}</span>
    </div>
  );
}

export function WarBottomDividendState({ active, value }: { active: boolean; value: number }) {
  if (!active) {
    return (
      <div className="w-full text-center font-mono">
        <div className="text-[9px] font-black uppercase leading-snug text-slate-400/75">NO DIVIDEND</div>
        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.18em] text-slate-700/85">FORECAST</div>
      </div>
    );
  }
  return (
    <div className="w-full text-center">
      <div className="mx-auto grid h-7 w-[86px] place-items-center border border-emerald-300/25 bg-emerald-300/[0.06] font-mono text-[8px] font-black uppercase text-emerald-200/85">PERP CARRY</div>
      <WarBottomMeter value={value} tone="emerald" compact />
    </div>
  );
}

export function WarBottomDualMeter({ top, bottom }: { top: number; bottom: number }) {
  return (
    <div className="space-y-2">
      <div>
        <WarBottomSmallText left="VS INDUSTRY" right={`${Math.round(top)}`} />
        <WarBottomMeter value={top} tone={top >= 62 ? "amber" : "cyan"} compact />
      </div>
      <div>
        <WarBottomSmallText left="VS HISTORY" right={`${Math.round(bottom)}`} />
        <WarBottomMeter value={bottom} tone={bottom >= 62 ? "emerald" : "cyan"} compact />
      </div>
    </div>
  );
}
export function formatBottomPrice(price: number, precision: number) {
  if (!Number.isFinite(price) || price <= 0) return "--";
  return price.toLocaleString(undefined, {
    minimumFractionDigits: Math.min(precision, 2),
    maximumFractionDigits: Math.min(Math.max(precision, 2), 5)
  });
}