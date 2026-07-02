export function MetricPill({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`min-w-0 border px-2 py-1.5 ${dark ? "border-white/10 bg-[#050b14]" : "border-[#d9e5f0] bg-[#f7fbff]"}`}>
      <div className={dark ? "truncate text-slate-600" : "truncate text-[#72839a]"}>{label}</div>
      <div className={dark ? "mt-1 truncate text-blue-200/85" : "mt-1 truncate text-[#1d4ed8]"}>{value}</div>
    </div>
  );
}
