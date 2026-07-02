import { ListChecks } from "lucide-react";
import type { Language } from "@shared/translations";
import type { StrategySuggestion } from "./types";
import { eventTagTone } from "./toneClasses";

export function WarRoomMetricCell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="relative min-w-0 border-r border-[#12324a] bg-[#031426] px-2.5 py-2 last:border-r-0">
      <div className="absolute inset-x-0 top-0 h-[2px] bg-blue-500/25" />
      <div className="truncate font-mono text-[7px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[11px] font-black ${tone}`}>{value}</div>
    </div>
  );
}

export function WarRoomMiniDepth({ values }: { values: number[] }) {
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 100;
    const y = 72 - (Math.max(0, Math.min(100, value)) / 100) * 58;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,72 ${points} 100,72`;

  return (
    <svg className="h-40 w-full" viewBox="0 0 100 78" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="warRoomDepthFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3b6f91" stopOpacity="0.62" />
          <stop offset="1" stopColor="#3b6f91" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      {[14, 28, 42, 56, 70].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#22506d" strokeWidth="0.7" />)}
      {[20, 40, 60, 80].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="76" stroke="#12324a" strokeWidth="0.7" />)}
      <polygon points={area} fill="url(#warRoomDepthFill)" />
      <polyline points={points} fill="none" stroke="#3b6f91" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <line x1="0" x2="100" y1="72" y2="72" stroke="#2a668a" strokeWidth="1" />
    </svg>
  );
}

export function WarRoomActionStack({ suggestions, lang }: { suggestions: StrategySuggestion[]; lang: Language }) {
  const zh = lang === "zh" || lang === "tc";

  return (
    <section className="bg-[#010b17]">
      <div className="flex h-8 items-center justify-between border-b border-[#12324a] bg-[#031827] px-3">
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.22em] text-blue-300/70">
          <ListChecks className="h-3 w-3" />
          {zh ? "执行门控" : "Execution Gates"}
        </div>
        <div className="font-mono text-[8px] font-black uppercase tracking-widest text-slate-500">DGWM GATE</div>
      </div>
      <div className="divide-y divide-[#12324a]">
        {suggestions.slice(0, 5).map((item, index) => (
          <div key={item.id} className="grid grid-cols-[34px_minmax(0,1fr)_62px] gap-2 px-3 py-2">
            <div className="font-mono text-[9px] font-black text-blue-300/70">{String(index + 1).padStart(2, "0")}</div>
            <div className="min-w-0">
              <div className="truncate text-[10px] font-black text-slate-200">{item.title}</div>
              <div className="mt-0.5 line-clamp-1 text-[8px] text-slate-500">{item.body}</div>
            </div>
            <div className={`self-start border px-1 py-0.5 text-right font-mono text-[7px] font-black uppercase tracking-widest ${eventTagTone(item.tone)}`}>
              {item.meta}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
