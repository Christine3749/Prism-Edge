interface NumberFieldProps {
  label: string;
  value: number;
  min: string;
  max: string;
  step?: string;
  onChange: (value: number) => void;
  className?: string;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
}

export function NumberField({ label, value, min, max, step, onChange, className }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`bg-slate-900 border border-slate-800 text-white px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs ${className || ""}`}
      />
    </div>
  );
}

export function ColorField({ label, value, onChange, size = "md" }: ColorFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-transparent border-none ${size === "sm" ? "w-10" : "w-12"} h-7 cursor-pointer`}
      />
    </div>
  );
}
