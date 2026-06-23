import { Check, X } from "lucide-react";
import type { IndicatorConfig } from "../../shared/src/types";
import { BollingerSection } from "./indicatorsModal/BollingerSection";
import { MacdSection } from "./indicatorsModal/MacdSection";
import { MovingAverageSection } from "./indicatorsModal/MovingAverageSection";
import { RsiSection } from "./indicatorsModal/RsiSection";

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: IndicatorConfig;
  onUpdateConfig: (config: IndicatorConfig) => void;
}

export default function IndicatorsModal({
  isOpen,
  onClose,
  config,
  onUpdateConfig
}: IndicatorsModalProps) {
  if (!isOpen) return null;

  const handleChange = (
    indicator: keyof IndicatorConfig,
    field: string,
    value: any
  ) => {
    onUpdateConfig({
      ...config,
      [indicator]: {
        ...config[indicator],
        [field]: value
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-xs select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-sans font-bold text-white text-sm uppercase tracking-widest">
            Setup Technical Indicators
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto no-scrollbar">
          <MovingAverageSection type="sma" config={config.sma} onChange={handleChange} />
          <MovingAverageSection type="ema" config={config.ema} onChange={handleChange} />
          <BollingerSection config={config.bollinger} onChange={handleChange} />
          <RsiSection config={config.rsi} onChange={handleChange} />
          <MacdSection config={config.macd} onChange={handleChange} />
        </div>

        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md uppercase tracking-wider"
          >
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Apply Indicators</span>
          </button>
        </div>
      </div>
    </div>
  );
}
