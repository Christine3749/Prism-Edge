import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Languages, Maximize2, Minimize2, Settings2, Timer } from "lucide-react";
import "./tempora.css";

type ClockMode = "12h" | "24h";
type LocaleMode = "zh" | "en";

interface TemporaSettings {
  clockMode: ClockMode;
  showSeconds: boolean;
  showMeridiem: boolean;
  locale: LocaleMode;
}

interface ClockParts {
  hours: string;
  minutes: string;
  seconds: string;
  meridiem: "AM" | "PM";
  spoken: string;
}

type WakeLockHandle = {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
};

const DEFAULT_SETTINGS: TemporaSettings = {
  clockMode: "24h",
  showSeconds: false,
  showMeridiem: true,
  locale: "zh"
};

const STORAGE_KEY = "tempora.flip.settings";

function readStoredSettings(): TemporaSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function getClockParts(date: Date, settings: TemporaSettings): ClockParts {
  const realHours = date.getHours();
  const meridiem = realHours >= 12 ? "PM" : "AM";
  const displayHours = settings.clockMode === "12h"
    ? realHours % 12 || 12
    : realHours;

  const hours = pad(displayHours);
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const spoken = settings.showSeconds
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`;

  return {
    hours,
    minutes,
    seconds,
    meridiem,
    spoken
  };
}

function useCurrentSecond() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeoutId = 0;

    const tick = () => {
      setNow(new Date());
      const delay = 1000 - (Date.now() % 1000);
      timeoutId = window.setTimeout(tick, delay);
    };

    timeoutId = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timeoutId);
  }, []);

  return now;
}

function DigitSlice({
  position,
  value,
  animated = false
}: {
  position: "top" | "bottom";
  value: string;
  animated?: boolean;
}) {
  return (
    <div
      className={`tempora-slice tempora-slice-${position} ${animated ? "is-animated" : ""}`}
      aria-hidden="true"
    >
      <div className="tempora-slice-value">{value}</div>
    </div>
  );
}

function FlipGroup({
  value,
  label,
  meridiem,
  showMeridiem
}: {
  value: string;
  label: string;
  meridiem?: "AM" | "PM";
  showMeridiem?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [nextValue, setNextValue] = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === displayValue) return;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setPreviousValue(displayValue);
    setNextValue(value);
    setIsFlipping(true);

    timeoutRef.current = window.setTimeout(() => {
      setDisplayValue(value);
      setIsFlipping(false);
    }, 320);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [displayValue, value]);

  const topValue = isFlipping ? nextValue : displayValue;
  const bottomValue = isFlipping ? previousValue : displayValue;

  return (
    <section className={`tempora-card ${isFlipping ? "is-flipping" : ""}`} aria-label={label}>
      {showMeridiem && meridiem && (
        <span className="tempora-meridiem" aria-hidden="true">
          {meridiem}
        </span>
      )}

      <DigitSlice position="top" value={topValue} />
      <DigitSlice position="bottom" value={bottomValue} />

      {isFlipping && (
        <>
          <DigitSlice position="top" value={previousValue} animated />
          <DigitSlice position="bottom" value={nextValue} animated />
        </>
      )}

      <span className="tempora-divider" aria-hidden="true" />
      <span className="sr-only">{value}</span>
    </section>
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

export default function TemporaFlip() {
  const [settings, setSettings] = useState<TemporaSettings>(readStoredSettings);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chromeTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockHandle | null>(null);
  const now = useCurrentSecond();

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

  useEffect(() => {
    const requestWakeLock = async () => {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> };
      };

      if (!nav.wakeLock || document.visibilityState !== "visible") return;

      try {
        wakeLockRef.current = await nav.wakeLock.request("screen");
      } catch {
        wakeLockRef.current = null;
      }
    };

    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const hideChrome = () => {
      setChromeVisible(false);
      chromeTimerRef.current = null;
    };

    const showChrome = () => {
      setChromeVisible(true);

      if (chromeTimerRef.current) {
        window.clearTimeout(chromeTimerRef.current);
      }

      chromeTimerRef.current = window.setTimeout(hideChrome, 3200);
    };

    showChrome();

    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "touchstart"];
    events.forEach((eventName) => window.addEventListener(eventName, showChrome, { passive: true }));

    return () => {
      if (chromeTimerRef.current) {
        window.clearTimeout(chromeTimerRef.current);
      }

      events.forEach((eventName) => window.removeEventListener(eventName, showChrome));
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const updateSettings = (patch: Partial<TemporaSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
  };

  return (
    <main className={`tempora-screen ${chromeVisible ? "is-awake" : "is-screensaver"}`}>
      <div
        className={`tempora-chrome ${chromeVisible ? "is-visible" : ""}`}
        aria-hidden={!chromeVisible}
      >
        <div className="tempora-brand">
          <Clock3 size={18} strokeWidth={1.8} />
          <span>Tempora Flip</span>
          <small>时幕翻页钟</small>
        </div>

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

          <button
            type="button"
            onClick={() => updateSettings({ locale: settings.locale === "zh" ? "en" : "zh" })}
            title="Language"
          >
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
      </div>

      <div
        className={`tempora-clock ${settings.showSeconds ? "has-seconds" : ""}`}
        role="timer"
        aria-live="polite"
        aria-label={clock.spoken}
      >
        <FlipGroup
          value={clock.hours}
          label={hourLabel}
          meridiem={clock.meridiem}
          showMeridiem={settings.clockMode === "12h" && settings.showMeridiem}
        />
        <FlipGroup value={clock.minutes} label={minuteLabel} />
        {settings.showSeconds && <FlipGroup value={clock.seconds} label={secondLabel} />}
      </div>

      <div className={`tempora-footer ${chromeVisible ? "is-visible" : ""}`} aria-hidden={!chromeVisible}>
        <span>{settings.locale === "zh" ? "让时间回归安静。" : "Time, Simplified."}</span>
      </div>
    </main>
  );
}
