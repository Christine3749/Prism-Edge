import { useEffect, useState } from "react";

export type ClockMode = "12h" | "24h";
export type LocaleMode = "zh" | "en";

export interface TemporaSettings {
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

export const STORAGE_KEY = "tempora.flip.settings";

export function readStoredSettings(): TemporaSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getClockParts(date: Date, settings: TemporaSettings): ClockParts {
  const realHours = date.getHours();
  const meridiem = realHours >= 12 ? "PM" : "AM";
  const displayHours = settings.clockMode === "12h" ? realHours % 12 || 12 : realHours;
  const hours = pad(displayHours);
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const spoken = settings.showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  return { hours, minutes, seconds, meridiem, spoken };
}

export function useCurrentSecond() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timeoutId = 0;
    const tick = () => {
      setNow(new Date());
      timeoutId = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timeoutId = window.setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => window.clearTimeout(timeoutId);
  }, []);
  return now;
}

export function useWakeLock() {
  useEffect(() => {
    let wakeLock: WakeLockHandle | null = null;
    const requestWakeLock = async () => {
      const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockHandle> } };
      if (!nav.wakeLock || document.visibilityState !== "visible") return;
      try {
        wakeLock = await nav.wakeLock.request("screen");
      } catch {
        wakeLock = null;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      wakeLock?.release().catch(() => undefined);
    };
  }, []);
}

export function useChromeAutoHide() {
  const [chromeVisible, setChromeVisible] = useState(true);
  useEffect(() => {
    let timer: number | null = null;
    const hideChrome = () => {
      setChromeVisible(false);
      timer = null;
    };
    const showChrome = () => {
      setChromeVisible(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(hideChrome, 3200);
    };
    const events: Array<keyof WindowEventMap> = ["mousemove", "mousedown", "keydown", "touchstart"];
    showChrome();
    events.forEach((eventName) => window.addEventListener(eventName, showChrome, { passive: true }));
    return () => {
      if (timer) window.clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, showChrome));
    };
  }, []);
  return { chromeVisible };
}

export function useFullscreenState() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  return [isFullscreen, setIsFullscreen] as const;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
