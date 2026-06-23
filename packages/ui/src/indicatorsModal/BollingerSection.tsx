import type { IndicatorConfig } from "../../../shared/src/types";
import { ColorField, NumberField } from "./FieldControls";
import { IndicatorCard } from "./IndicatorCard";
import type { IndicatorChangeHandler } from "./types";

interface BollingerSectionProps {
  config: IndicatorConfig["bollinger"];
  onChange: IndicatorChangeHandler;
}

export function BollingerSection({ config, onChange }: BollingerSectionProps) {
  return (
    <IndicatorCard
      active={config.active}
      label="Bollinger Bands (BOLL)"
      onToggle={(value) => onChange("bollinger", "active", value)}
      marker={
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-3 pl-6 text-[11px] text-slate-400">
        <NumberField
          label="Basis Period:"
          value={config.period}
          min="5"
          max="100"
          onChange={(value) => onChange("bollinger", "period", value || 1)}
        />
        <NumberField
          label="StdDev multiplier:"
          value={config.multiplier}
          min="1"
          max="5"
          step="0.1"
          onChange={(value) => onChange("bollinger", "multiplier", value || 2)}
        />
        <ColorField
          label="Upper Band Color:"
          value={config.colorUpper}
          onChange={(value) => onChange("bollinger", "colorUpper", value)}
          size="sm"
        />
      </div>
    </IndicatorCard>
  );
}
