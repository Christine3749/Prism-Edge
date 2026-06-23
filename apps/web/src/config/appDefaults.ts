import type { AppSettings, IndicatorConfig } from "@shared/types";

export const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = {
  sma: { active: true, period: 20, color: "#22d3ee" },
  ema: { active: false, period: 50, color: "#3b82f6" },
  bollinger: {
    active: false,
    period: 20,
    multiplier: 2,
    colorBasis: "#6366f1",
    colorUpper: "#818cf8",
    colorLower: "#818cf8",
    colorFill: "rgba(99, 102, 241, 0.05)"
  },
  rsi: { active: false, period: 14, color: "#ec4899", overbought: 70, oversold: 30 },
  macd: {
    active: false,
    fast: 12,
    slow: 26,
    signal: 9,
    colorMacd: "#38bdf8",
    colorSignal: "#f472b6",
    colorHistUp: "#10b981",
    colorHistDown: "#ef4444"
  }
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: "dark",
  gridLines: true,
  solidBackground: false,
  upColor: "#10b981",
  downColor: "#ef4444",
  timezone: "Etc/UTC",
  useInternationalColor: true,
  autoSaveLayout: true
};
