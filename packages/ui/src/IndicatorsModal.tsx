import React from "react";
import { X, Check } from "lucide-react";
import { IndicatorConfig } from "../../shared/src/types";

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
    const updated = {
      ...config,
      [indicator]: {
        ...config[indicator],
        [field]: value
      }
    };
    onUpdateConfig(updated);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-xs select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header toolbar */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-sans font-bold tracking-tight text-white text-sm uppercase tracking-widest">Setup Technical Indicators</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Configurations content */}
        <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto no-scrollbar">
          
          {/* Indicator 1: SMA */}
          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={config.sma.active}
                  onChange={(e) => handleChange("sma", "active", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-900 h-4 w-4"
                />
                <span>Simple Moving Average (SMA)</span>
              </label>
              <div 
                className="w-3.5 h-3.5 rounded-full" 
                style={{ backgroundColor: config.sma.color }}
              ></div>
            </div>
            
            {config.sma.active && (
              <div className="grid grid-cols-2 gap-4 pl-6 text-[11px] text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Lookback Period (Bars):</span>
                  <input
                    type="number"
                    value={config.sma.period}
                    min="2"
                    max="200"
                    onChange={(e) => handleChange("sma", "period", parseInt(e.target.value) || 1)}
                    className="bg-slate-950 border border-slate-800 text-white px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Line stroke color:</span>
                  <input
                    type="color"
                    value={config.sma.color}
                    onChange={(e) => handleChange("sma", "color", e.target.value)}
                    className="bg-transparent border-none w-12 h-7 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Indicator 2: EMA */}
          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={config.ema.active}
                  onChange={(e) => handleChange("ema", "active", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
                <span>Exponential Moving Average (EMA)</span>
              </label>
              <div 
                className="w-3.5 h-3.5 rounded-full" 
                style={{ backgroundColor: config.ema.color }}
              ></div>
            </div>
            
            {config.ema.active && (
              <div className="grid grid-cols-2 gap-4 pl-6 text-[11px] text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Lookback Period (Bars):</span>
                  <input
                    type="number"
                    value={config.ema.period}
                    min="2"
                    max="200"
                    onChange={(e) => handleChange("ema", "period", parseInt(e.target.value) || 1)}
                    className="bg-slate-900 border border-slate-800 text-white px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Line stroke color:</span>
                  <input
                    type="color"
                    value={config.ema.color}
                    onChange={(e) => handleChange("ema", "color", e.target.value)}
                    className="bg-transparent border-none w-12 h-7 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Indicator 3: Bollinger Bands */}
          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={config.bollinger.active}
                  onChange={(e) => handleChange("bollinger", "active", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
                <span>Bollinger Bands (BOLL)</span>
              </label>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400"></span>
              </div>
            </div>
            
            {config.bollinger.active && (
              <div className="grid grid-cols-3 gap-3 pl-6 text-[11px] text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Basis Period:</span>
                  <input
                    type="number"
                    value={config.bollinger.period}
                    min="5"
                    max="100"
                    onChange={(e) => handleChange("bollinger", "period", parseInt(e.target.value) || 1)}
                    className="bg-slate-900 border border-slate-800 text-white px-1.5 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>StdDev multiplier:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={config.bollinger.multiplier}
                    min="1"
                    max="5"
                    onChange={(e) => handleChange("bollinger", "multiplier", parseFloat(e.target.value) || 2)}
                    className="bg-slate-900 border border-slate-800 text-white px-1.5 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Upper Band Color:</span>
                  <input
                    type="color"
                    value={config.bollinger.colorUpper}
                    onChange={(e) => handleChange("bollinger", "colorUpper", e.target.value)}
                    className="bg-transparent border-none w-10 h-7 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Indicator 4: RSI */}
          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={config.rsi.active}
                  onChange={(e) => handleChange("rsi", "active", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
                <span>Relative Strength Index (RSI)</span>
              </label>
              <div 
                className="w-3.5 h-3.5 rounded-full" 
                style={{ backgroundColor: config.rsi.color }}
              ></div>
            </div>
            
            {config.rsi.active && (
              <div className="grid grid-cols-3 gap-3 pl-6 text-[11px] text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>RSI Period:</span>
                  <input
                    type="number"
                    value={config.rsi.period}
                    min="2"
                    max="50"
                    onChange={(e) => handleChange("rsi", "period", parseInt(e.target.value) || 1)}
                    className="bg-slate-900 border border-slate-800 text-white px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Overbought Line:</span>
                  <input
                    type="number"
                    value={config.rsi.overbought}
                    min="50"
                    max="95"
                    onChange={(e) => handleChange("rsi", "overbought", parseInt(e.target.value) || 70)}
                    className="bg-slate-900 border border-slate-800 text-white px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Oversold Line:</span>
                  <input
                    type="number"
                    value={config.rsi.oversold}
                    min="5"
                    max="50"
                    onChange={(e) => handleChange("rsi", "oversold", parseInt(e.target.value) || 30)}
                    className="bg-slate-900 border border-slate-800 text-white px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Indicator 5: MACD */}
          <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={config.macd.active}
                  onChange={(e) => handleChange("macd", "active", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
                <span>MACD (Momentum)</span>
              </label>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded bg-[#38bdf8]"></span>
                <span className="w-2 h-2 rounded bg-[#f472b6]"></span>
              </div>
            </div>
            
            {config.macd.active && (
              <div className="grid grid-cols-3 gap-3 pl-6 text-[11px] text-slate-400">
                <div className="flex flex-col gap-1.5">
                  <span>Fast Period:</span>
                  <input
                    type="number"
                    value={config.macd.fast}
                    min="5"
                    max="50"
                    onChange={(e) => handleChange("macd", "fast", parseInt(e.target.value) || 12)}
                    className="bg-slate-900 border border-slate-800 text-white px-1.5 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Slow Period:</span>
                  <input
                    type="number"
                    value={config.macd.slow}
                    min="10"
                    max="100"
                    onChange={(e) => handleChange("macd", "slow", parseInt(e.target.value) || 26)}
                    className="bg-slate-900 border border-slate-800 text-white px-1.5 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span>Signal EMA:</span>
                  <input
                    type="number"
                    value={config.macd.signal}
                    min="2"
                    max="40"
                    onChange={(e) => handleChange("macd", "signal", parseInt(e.target.value) || 9)}
                    className="bg-slate-900 border border-slate-800 text-white px-1.5 py-1 rounded focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer actions */}
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
