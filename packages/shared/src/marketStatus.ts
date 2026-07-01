import type { MarketDataQuality, MarketDataState, MarketDataStatus } from "./types";

export type MarketStatusLanguage = "en" | "zh" | "tc";

interface BuildMarketStatusInput {
  state: MarketDataState;
  source: string;
  provider?: string;
  updatedAt?: number;
  latencyMs?: number;
  freshnessMs?: number;
  reason?: string;
  message?: string;
  route?: string[];
}

export function getFeedState(source: string, isLive: boolean): MarketDataState {
  if (isLive) return "live";
  const normalized = source.toLowerCase();
  if (["unavailable", "offline", "error", "failed"].some((name) => normalized.includes(name))) return "error";
  if (["yahoo", "polygon", "twelve", "finnhub", "alpha"].some((name) => normalized.includes(name))) return "delayed";
  if (normalized.includes("sim") || normalized.includes("fallback") || normalized.includes("local")) return "simulated";
  return "error";
}

export function buildMarketStatus(input: BuildMarketStatusInput): MarketDataStatus {
  const quality = getFeedQuality(input.state);
  const confidence = getFeedConfidence(input.state);
  const reason = input.reason || defaultReason(input.state, input.source);
  return {
    state: input.state,
    source: input.source,
    provider: input.provider,
    updatedAt: input.updatedAt,
    latencyMs: input.latencyMs,
    freshnessMs: input.freshnessMs,
    quality,
    confidence,
    reason,
    route: input.route || [input.source],
    message: input.message || reason
  };
}

export function getFeedQuality(state: MarketDataState): MarketDataQuality {
  if (state === "live") return "verified";
  if (state === "delayed") return "public-delayed";
  if (state === "error") return "unavailable";
  return "protected";
}

export function getFeedConfidence(state: MarketDataState) {
  switch (state) {
    case "live":
      return 0.96;
    case "delayed":
      return 0.72;
    case "loading":
      return 0.45;
    case "stale":
      return 0.34;
    case "simulated":
      return 0.28;
    case "error":
      return 0.08;
    default:
      return 0.2;
  }
}

export function describeMarketStatus(status: MarketDataStatus, lang: MarketStatusLanguage = "en") {
  const stateLabel = translateState(status.state, lang);
  const shortLabel = translateShortState(status.state, lang);
  const qualityLabel = translateQuality(status.quality || getFeedQuality(status.state), lang);
  const confidence = typeof status.confidence === "number" ? status.confidence : getFeedConfidence(status.state);
  const confidenceLabel = `${Math.round(confidence * 100)}%`;
  const source = status.source || "gateway";
  const reason = status.reason || status.message || defaultReason(status.state, source);
  const latency = status.latencyMs ? ` · ${status.latencyMs}ms` : "";
  const age = formatFeedAge(status.updatedAt, Date.now(), lang);
  const sourceLine = `${source}${latency}${age ? ` · ${age}` : ""}`;
  return {
    label: stateLabel,
    shortLabel,
    qualityLabel,
    confidenceLabel,
    reason,
    sourceLine,
    tooltip: `${stateLabel} · ${qualityLabel} · ${sourceLine} · ${reason}`
  };
}

export function formatFeedAge(updatedAt?: number, now = Date.now(), lang: MarketStatusLanguage = "en") {
  if (!updatedAt) return "";
  const ageSeconds = Math.max(0, Math.round((now - updatedAt) / 1000));
  if (ageSeconds < 3) return lang === "en" ? "now" : "刚刚";
  if (ageSeconds < 60) return `${ageSeconds}s`;
  const ageMinutes = Math.round(ageSeconds / 60);
  return `${ageMinutes}m`;
}

function defaultReason(state: MarketDataState, source: string) {
  if (state === "live") return `Realtime candles and quotes are flowing through ${source}.`;
  if (state === "delayed") return `Public delayed market feed is active through ${source}.`;
  if (state === "stale") return "No fresh market update arrived within the freshness window.";
  if (state === "error") return "Primary market gateway is unreachable.";
  if (state === "loading") return "Market gateway handshake is in progress.";
  return "External feed is unavailable; local simulator is protecting the terminal view.";
}

function translateState(state: MarketDataState, lang: MarketStatusLanguage) {
  const labels = {
    en: {
      loading: "Loading",
      live: "Live feed",
      delayed: "Delayed feed",
      simulated: "Simulation guard",
      stale: "Stale feed",
      error: "Feed offline"
    },
    zh: {
      loading: "连接中",
      live: "真实行情",
      delayed: "延迟行情",
      simulated: "模拟保护",
      stale: "数据过期",
      error: "源异常"
    },
    tc: {
      loading: "連接中",
      live: "真實行情",
      delayed: "延遲行情",
      simulated: "模擬保護",
      stale: "資料過期",
      error: "源異常"
    }
  } as const;
  return labels[lang][state];
}

function translateShortState(state: MarketDataState, lang: MarketStatusLanguage) {
  if (lang === "en") {
    return {
      loading: "LOAD",
      live: "LIVE",
      delayed: "DELAY",
      simulated: "SIM GUARD",
      stale: "STALE",
      error: "OFFLINE"
    }[state];
  }
  return {
    loading: lang === "tc" ? "載入" : "载入",
    live: lang === "tc" ? "真實源" : "真实源",
    delayed: lang === "tc" ? "延遲" : "延迟",
    simulated: lang === "tc" ? "模擬保護" : "模拟保护",
    stale: lang === "tc" ? "過期" : "过期",
    error: lang === "tc" ? "斷線" : "断线"
  }[state];
}

function translateQuality(quality: MarketDataQuality, lang: MarketStatusLanguage) {
  const labels = {
    en: {
      verified: "verified",
      "public-delayed": "public delayed",
      protected: "protected",
      unavailable: "unavailable"
    },
    zh: {
      verified: "已验证",
      "public-delayed": "公共延迟",
      protected: "保护模式",
      unavailable: "不可用"
    },
    tc: {
      verified: "已驗證",
      "public-delayed": "公共延遲",
      protected: "保護模式",
      unavailable: "不可用"
    }
  } as const;
  return labels[lang][quality];
}
