import type { IndicatorConfig } from "../../../shared/src/types";
import { NumberField } from "./FieldControls";
import { IndicatorCard } from "./IndicatorCard";
import type { IndicatorChangeHandler } from "./types";

interface RsiSectionProps {
  config: IndicatorConfig["rsi"];
  onChange: IndicatorChangeHandler;
}

export function RsiSection({ config, onChange }: RsiSectionProps) {
  return (
    <IndicatorCard
      active={config.active}
      label="Relative Strength Index (RSI)"
      swatch={config.color}
      onToggle={(value) => onChange("rsi", "active", value)}
    >
      <div className="grid grid-cols-3 gap-3 pl-6 text-[11px] text-slate-400">
        <NumberField label="RSI Period:" value={config.period} min="2" max="50" onChange={(value) => onChange("rsi", "period", value || 1)} />
        <NumberField label="Overbought Line:" value={config.overbought} min="50" max="95" onChange={(value) => onChange("rsi", "overbought", value || 70)} />
        <NumberField label="Oversold Line:" value={config.oversold} min="5" max="50" onChange={(value) => onChange("rsi", "oversold", value || 30)} />
      </div>
    </IndicatorCard>
  );
}
