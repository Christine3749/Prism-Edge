import { Languages, Maximize2, Minimize2, Settings2, Timer } from "lucide-react";
import type { ClockMode, TemporaSettings } from "./temporaModel";

interface TemporaControlsProps {
  settings: TemporaSettings;
  isFullscreen: boolean;
  updateSettings: (patch: Partial<TemporaSettings>) => void;
  toggleFullscreen: () => void;
}

export function TemporaControls({
  settings,
  isFullscreen,
  updateSettings,
  toggleFullscreen
}: TemporaControlsProps) {
  return (
    <div className="tempora-controls" aria-label="Tempora Flip controls">
      <SegmentedClockMode
        value={settings.clockMode}
        onChange={(clockMode) => updateSettings({ clockMode })}
      />
      <button
        type="button"
        className={settings.showSeconds ? "is-active" : ""}
        onClick={() => updateSettings({ showSeconds: !settings.showSeconds })}
        title="Show seconds"
        aria-pressed={settings.showSeconds}
      >
        <Timer size={15} strokeWidth={1.8} />
        <span>SS</span>
      </button>
      <button
        type="button"
        className={settings.showMeridiem ? "is-active" : ""}
        onClick={() => updateSettings({ showMeridiem: !settings.showMeridiem })}
        title="AM/PM marker"
        aria-pressed={settings.showMeridiem}
      >
        <Settings2 size={15} strokeWidth={1.8} />
        <span>AM</span>
      </button>
      <button type="button" onClick={() => updateSettings({ locale: settings.locale === "zh" ? "en" : "zh" })} title="Language">
        <Languages size={15} strokeWidth={1.8} />
        <span>{settings.locale === "zh" ? "中" : "EN"}</span>
      </button>
      <button
        type="button"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize2 size={15} strokeWidth={1.8} /> : <Maximize2 size={15} strokeWidth={1.8} />}
      </button>
    </div>
  );
}

function SegmentedClockMode({
  value,
  onChange
}: {
  value: ClockMode;
  onChange: (value: ClockMode) => void;
}) {
  return (
    <div className="tempora-segmented" role="group" aria-label="Clock mode">
      {(["24h", "12h"] as ClockMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          className={value === mode ? "is-active" : ""}
          onClick={() => onChange(mode)}
          title={mode === "24h" ? "24-hour clock" : "12-hour clock"}
        >
          {mode.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
