import type { IndicatorConfig } from "../../../shared/src/types";
import { NumberField } from "./FieldControls";
import { IndicatorCard } from "./IndicatorCard";
import type { IndicatorChangeHandler } from "./types";

interface MacdSectionProps {
  config: IndicatorConfig["macd"];
  onChange: IndicatorChangeHandler;
}

export function MacdSection({ config, onChange }: MacdSectionProps) {
  return (
    <IndicatorCard
      active={config.active}
      label="MACD (Momentum)"
      onToggle={(value) => onChange("macd", "active", value)}
      marker={
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded bg-[#38bdf8]"></span>
          <span className="w-2 h-2 rounded bg-[#f472b6]"></span>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3 pl-6 text-[11px] text-slate-400">
        <NumberField label="Fast Period:" value={config.fast} min="5" max="50" onChange={(value) => onChange("macd", "fast", value || 12)} />
        <NumberField label="Slow Period:" value={config.slow} min="10" max="100" onChange={(value) => onChange("macd", "slow", value || 26)} />
        <NumberField label="Signal EMA:" value={config.signal} min="2" max="40" onChange={(value) => onChange("macd", "signal", value || 9)} />
      </div>
    </IndicatorCard>
  );
}
