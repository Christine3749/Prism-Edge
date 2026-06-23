import type { IndicatorConfig } from "../../../shared/src/types";
import { ColorField, NumberField } from "./FieldControls";
import { IndicatorCard } from "./IndicatorCard";
import type { IndicatorChangeHandler } from "./types";

interface MovingAverageSectionProps {
  type: "sma" | "ema";
  config: IndicatorConfig["sma"] | IndicatorConfig["ema"];
  onChange: IndicatorChangeHandler;
}

export function MovingAverageSection({ type, config, onChange }: MovingAverageSectionProps) {
  const isSma = type === "sma";
  return (
    <IndicatorCard
      active={config.active}
      label={isSma ? "Simple Moving Average (SMA)" : "Exponential Moving Average (EMA)"}
      swatch={config.color}
      onToggle={(value) => onChange(type, "active", value)}
    >
      <div className="grid grid-cols-2 gap-4 pl-6 text-[11px] text-slate-400">
        <NumberField
          label="Lookback Period (Bars):"
          value={config.period}
          min="2"
          max="200"
          onChange={(value) => onChange(type, "period", value || 1)}
        />
        <ColorField
          label="Line stroke color:"
          value={config.color}
          onChange={(value) => onChange(type, "color", value)}
        />
      </div>
    </IndicatorCard>
  );
}
