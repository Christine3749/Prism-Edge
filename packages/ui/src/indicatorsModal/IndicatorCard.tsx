interface IndicatorCardProps {
  active: boolean;
  label: string;
  swatch?: string;
  children?: React.ReactNode;
  onToggle: (active: boolean) => void;
  marker?: React.ReactNode;
}

export function IndicatorCard({
  active,
  label,
  swatch,
  children,
  onToggle,
  marker
}: IndicatorCardProps) {
  return (
    <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white uppercase tracking-wider">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
          />
          <span>{label}</span>
        </label>
        {marker || (swatch && <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: swatch }}></div>)}
      </div>
      {active && children}
    </div>
  );
}
