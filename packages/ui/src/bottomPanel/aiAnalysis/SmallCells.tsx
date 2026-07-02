export function ActionStep({ index, title, meta }: { index: string; title: string; meta: string }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-2 rounded border border-[#12324a] bg-[#031426]/72 p-2">
      <div className="font-mono text-[10px] font-black text-blue-300/70">{index}</div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-black text-slate-100">{title}</div>
        <div className="mt-0.5 truncate text-[8px] text-slate-500">{meta}</div>
      </div>
    </div>
  );
}

export function DecisionMetric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded border border-[#12324a] bg-[#031426]/72 px-2.5 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-[12px] font-black ${tone}`}>{value}</div>
    </div>
  );
}