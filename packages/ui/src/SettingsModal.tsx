import React from "react";
import { X, Check } from "lucide-react";
import { AppSettings } from "../../shared/src/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings
}: SettingsModalProps) {
  if (!isOpen) return null;

  const handleChange = (field: keyof AppSettings, value: any) => {
    // If updating useInternationalColor, also update default up/down color values for convenience!
    if (field === "useInternationalColor") {
      const up = value ? "#10b981" : "#ef4444"; // international: green-up; Chinese: red-up
      const down = value ? "#ef4444" : "#10b981"; // international: red-down; Chinese: green-down
      onUpdateSettings({
        ...settings,
        useInternationalColor: value,
        upColor: up,
        downColor: down
      });
    } else {
      onUpdateSettings({
        ...settings,
        [field]: value
      });
    }
  };

  const timezones = [
    { label: "UTC Time", value: "Etc/UTC" },
    { label: "New York (EST/EDT)", value: "America/New_York" },
    { label: "London (GMT/BST)", value: "Europe/London" },
    { label: "Tokyo (JST)", value: "Asia/Tokyo" },
    { label: "Singapore (SGT)", value: "Asia/Singapore" },
    { label: "Shanghai (CST)", value: "Asia/Shanghai" }
  ];

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 backdrop-blur-xs select-none">
      <div className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        
        {/* Header */}
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-sans font-bold tracking-tight text-white text-sm uppercase tracking-widest">Prism-Edge Workspace Settings</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 space-y-4 text-xs text-slate-400 max-h-[380px] overflow-y-auto no-scrollbar">
          
          {/* Theme & Sync Preferences */}
          <div className="space-y-2">
            <span className="font-bold text-white text-xs block uppercase tracking-wider">Aesthetic Visual Theme</span>
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span>UI Theme Select (Light/Dark)</span>
                <select
                  value={settings.theme}
                  onChange={(e) => handleChange("theme", e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-sans text-xs w-28 cursor-pointer"
                >
                  <option value="dark" className="bg-slate-950">Deep Dark</option>
                  <option value="light" className="bg-slate-950">Aura Light</option>
                </select>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Automatic Save Layout Toggles</span>
                <input
                  type="checkbox"
                  checked={settings.autoSaveLayout}
                  onChange={(e) => handleChange("autoSaveLayout", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* Color Schemes Preference */}
          <div className="space-y-2">
            <span className="font-bold text-white text-xs block uppercase tracking-wider">Market Color Standards</span>
            
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex flex-col">
                  <span>Candle Color Style Standard</span>
                  <span className="text-[10px] text-slate-500">国际绿涨红跌 / 中国红涨绿跌</span>
                </div>
                <select
                  value={settings.useInternationalColor ? "international" : "chinese"}
                  onChange={(e) => handleChange("useInternationalColor", e.target.value === "international")}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded focus:outline-none focus:border-cyan-500 font-sans text-xs w-40 cursor-pointer"
                >
                  <option value="international" className="bg-slate-950">International (绿色涨/红色跌)</option>
                  <option value="chinese" className="bg-slate-950">Chinese Standard (红色涨/绿色跌)</option>
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-800/65">
                <div className="flex flex-col gap-1">
                  <span>Rising Color:</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-white">
                    <input
                      type="color"
                      value={settings.upColor}
                      onChange={(e) => handleChange("upColor", e.target.value)}
                      className="bg-transparent border-none w-8 h-6 cursor-pointer"
                    />
                    <span>{settings.upColor.toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span>Falling Color:</span>
                  <div className="flex items-center gap-1.5 font-mono text-xs text-white">
                    <input
                      type="color"
                      value={settings.downColor}
                      onChange={(e) => handleChange("downColor", e.target.value)}
                      className="bg-transparent border-none w-8 h-6 cursor-pointer"
                    />
                    <span>{settings.downColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid & Canvas Layout */}
          <div className="space-y-2">
            <span className="font-bold text-white text-xs block uppercase tracking-wider">Grid & Canvas Layout</span>
            
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span>Display Grid Matrix Lines</span>
                <input
                  type="checkbox"
                  checked={settings.gridLines}
                  onChange={(e) => handleChange("gridLines", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>Solid Backdrop Background (No gradient)</span>
                <input
                  type="checkbox"
                  checked={settings.solidBackground}
                  onChange={(e) => handleChange("solidBackground", e.target.checked)}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500 bg-slate-950 h-4 w-4"
                />
              </label>
            </div>
          </div>

          {/* Market Timings Timezone */}
          <div className="space-y-2">
            <span className="font-bold text-white text-xs block uppercase tracking-wider">Clock Reference</span>
            <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
              <span>Display Candle Timezone:</span>
              <select
                value={settings.timezone}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1.5 rounded focus:outline-none focus:border-cyan-500 text-xs w-full cursor-pointer font-sans"
              >
                {timezones.map((tz) => (
                  <option key={tz.value} value={tz.value} className="bg-slate-950">
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md uppercase tracking-wider"
          >
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Apply Settings</span>
          </button>
        </div>

      </div>
    </div>
  );
}
