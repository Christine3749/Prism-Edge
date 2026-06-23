import { Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FlipGroup } from "./FlipGroup";
import { TemporaControls } from "./TemporaControls";
import {
  getClockParts,
  readStoredSettings,
  STORAGE_KEY,
  type TemporaSettings,
  useChromeAutoHide,
  useCurrentSecond,
  useFullscreenState,
  useWakeLock
} from "./temporaModel";
import "./tempora.css";

export default function TemporaFlip() {
  const [settings, setSettings] = useState<TemporaSettings>(readStoredSettings);
  const [isFullscreen, setIsFullscreen] = useFullscreenState();
  const { chromeVisible } = useChromeAutoHide();
  const now = useCurrentSecond();
  useWakeLock();

  const clock = useMemo(() => getClockParts(now, settings), [now, settings]);
  const hourLabel = settings.locale === "zh" ? "小时" : "Hours";
  const minuteLabel = settings.locale === "zh" ? "分钟" : "Minutes";
  const secondLabel = settings.locale === "zh" ? "秒" : "Seconds";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Tempora Flip｜时幕翻页钟";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const updateSettings = (patch: Partial<TemporaSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <main className={`tempora-screen ${chromeVisible ? "is-awake" : "is-screensaver"}`}>
      <div className={`tempora-chrome ${chromeVisible ? "is-visible" : ""}`} aria-hidden={!chromeVisible}>
        <div className="tempora-brand">
          <Clock3 size={18} strokeWidth={1.8} />
          <span>Tempora Flip</span>
          <small>时幕翻页钟</small>
        </div>
        <TemporaControls
          settings={settings}
          isFullscreen={isFullscreen}
          updateSettings={updateSettings}
          toggleFullscreen={toggleFullscreen}
        />
      </div>

      <div className={`tempora-clock ${settings.showSeconds ? "has-seconds" : ""}`} role="timer" aria-live="polite" aria-label={clock.spoken}>
        <FlipGroup value={clock.hours} label={hourLabel} meridiem={clock.meridiem} showMeridiem={settings.clockMode === "12h" && settings.showMeridiem} />
        <FlipGroup value={clock.minutes} label={minuteLabel} />
        {settings.showSeconds && <FlipGroup value={clock.seconds} label={secondLabel} />}
      </div>

      <div className={`tempora-footer ${chromeVisible ? "is-visible" : ""}`} aria-hidden={!chromeVisible}>
        <span>{settings.locale === "zh" ? "让时间回归安静。" : "Time, Simplified."}</span>
      </div>
    </main>
  );
}
