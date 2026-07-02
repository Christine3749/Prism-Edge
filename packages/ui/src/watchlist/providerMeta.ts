import type { MarketDataStatus, MarketSymbol } from "@shared/types";
import type { FavoriteSyncState } from "./types";

export function getRowProviderMeta(symbol: MarketSymbol, selected: boolean, status: MarketDataStatus | undefined, zh: boolean) {
  const state = getSymbolFeedState(symbol, selected, status);
  const stateLabels: Record<MarketDataStatus["state"], string> = {
    loading: zh ? "连接中" : "loading",
    live: zh ? "实时" : "live",
    delayed: zh ? "延迟" : "delayed",
    simulated: zh ? "模拟" : "sim",
    stale: zh ? "过期" : "stale",
    error: zh ? "异常" : "error"
  };
  const source = selected && status?.source
    ? status.source
    : symbol.lastSource || symbol.dataProvider || symbol.exchange || symbol.type || "catalog";
  const provider = formatProviderName(source);
  const route = selected && Array.isArray(status?.route) && status.route.length > 0
    ? status.route.map(formatProviderName).join(" -> ")
    : provider;
  const age = formatFeedAge(symbol.lastUpdatedAt, zh);
  const label = [provider, stateLabels[state], age].filter(Boolean).join(" · ");
  const tooltip = [
    zh ? `市场: ${getMarketDisplayName(symbol.market || symbol.type, zh)}` : `Market: ${getMarketDisplayName(symbol.market || symbol.type, zh)}`,
    zh ? `Provider: ${route}` : `Provider: ${route}`,
    zh ? `状态: ${stateLabels[state]}` : `State: ${stateLabels[state]}`,
    age ? (zh ? `更新: ${age}` : `Updated: ${age}`) : ""
  ].filter(Boolean).join("\n");
  return { label, tooltip };
}

export function getProviderMeta(status: MarketDataStatus | undefined, zh: boolean) {
  const state = status?.state || "loading";
  const stateLabels: Record<MarketDataStatus["state"], string> = {
    loading: zh ? "连接中" : "loading",
    live: zh ? "真实源" : "live",
    delayed: zh ? "延迟源" : "delayed",
    simulated: zh ? "模拟保护" : "sim guard",
    stale: zh ? "源过期" : "stale",
    error: zh ? "源异常" : "offline"
  };
  const route = Array.isArray(status?.route) && status.route.length > 0
    ? status.route
    : [status?.source || "gateway"];
  const routeText = route.map(formatProviderName).join(" -> ");
  const routeShort = route.length > 2
    ? `${formatProviderName(route[0])} -> ${formatProviderName(route[route.length - 1])}`
    : routeText;
  const quality = status?.quality || "protected";
  const tooltip = [
    zh ? `Provider 链路: ${routeText}` : `Provider route: ${routeText}`,
    zh ? `质量: ${quality}` : `Quality: ${quality}`,
    status?.reason || status?.message || ""
  ].filter(Boolean).join("\n");
  return { stateLabel: stateLabels[state], routeText, routeShort, tooltip };
}

export function getMarketDisplayName(market: string | undefined, zh: boolean) {
  const normalized = (market || "").toLowerCase();
  const labels: Record<string, { zh: string; en: string }> = {
    all: { zh: "全部", en: "ALL" },
    favorites: { zh: "自选", en: "FAV" },
    crypto: { zh: "Crypto", en: "CRYPTO" },
    us: { zh: "美股", en: "US" },
    cn: { zh: "A股", en: "CN" },
    hk: { zh: "港股", en: "HK" },
    forex: { zh: "外汇", en: "FX" },
    stock: { zh: "股票", en: "STOCK" },
    eu: { zh: "欧洲", en: "EU" },
    jp: { zh: "日本", en: "JP" },
    au: { zh: "澳洲", en: "AU" },
    internal: { zh: "内部", en: "INT" }
  };
  const label = labels[normalized];
  return label ? (zh ? label.zh : label.en) : normalized.toUpperCase();
}

export function getFavoriteSyncMeta(state: FavoriteSyncState, zh: boolean) {
  switch (state) {
    case "verified":
      return { label: zh ? "云验证" : "verified", detail: zh ? "已保存并从云端回放验证一致。" : "Saved and replay-verified from cloud.", className: "text-emerald-200" };
    case "synced":
      return { label: zh ? "云同步" : "cloud", detail: zh ? "已登录，星标会同步到云端。" : "Signed in; favorites sync to cloud.", className: "text-emerald-300/80" };
    case "syncing":
      return { label: zh ? "同步中" : "syncing", detail: zh ? "正在同步自选列表。" : "Syncing favorites.", className: "text-blue-300/80" };
    case "error":
      return { label: zh ? "待重试" : "retry", detail: zh ? "云同步失败，本地自选已保留。" : "Cloud sync failed; local favorites are preserved.", className: "text-amber-300/85" };
    default:
      return { label: zh ? "未登录" : "signed out", detail: zh ? "未登录时保存在本机，登录后会自动合并并同步。" : "Stored locally until sign-in; then merged and synced.", className: "text-slate-500" };
  }
}

export function getSymbolFeedState(symbol: MarketSymbol, selected: boolean, marketStatus?: MarketDataStatus): MarketDataStatus["state"] {
  if (selected && marketStatus?.state) return marketStatus.state;
  if (symbol.lastDataState) return symbol.lastDataState;
  if (symbol.dataProvider === "binance" || symbol.dataProvider === "coinbase") return "live";
  if (["yahoo", "polygon", "twelve-data", "finnhub", "alpha-vantage"].includes(symbol.dataProvider || "")) return "delayed";
  return "simulated";
}

function formatFeedAge(updatedAt: number | undefined, zh: boolean) {
  if (!updatedAt) return "";
  const timestamp = updatedAt < 1_000_000_000_000 ? updatedAt * 1000 : updatedAt;
  const deltaMs = Math.max(0, Date.now() - timestamp);
  const minute = 60_000;
  if (deltaMs < minute) return zh ? "刚刚" : "now";
  const minutes = Math.round(deltaMs / minute);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function formatProviderName(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("binance")) return "Binance";
  if (normalized.includes("coinbase")) return "Coinbase";
  if (normalized.includes("polygon")) return "Polygon";
  if (normalized.includes("twelve")) return "TwelveData";
  if (normalized.includes("finnhub")) return "Finnhub";
  if (normalized.includes("alpha")) return "AlphaV";
  if (normalized.includes("yahoo")) return "Yahoo";
  if (normalized.includes("sim")) return "Sim";
  if (normalized.includes("local")) return "Local";
  return value || "Gateway";
}
