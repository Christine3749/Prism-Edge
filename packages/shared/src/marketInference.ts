import type { MarketSymbol } from "./types";

export function inferHongKongSymbol(normalized: string): MarketSymbol | null {
  const rawCode = normalized.replace(/\.HK$/, "");
  if (!/^\d{1,5}$/.test(rawCode)) return null;

  const parsed = Number.parseInt(rawCode, 10);
  if (!Number.isFinite(parsed)) return null;

  const code = parsed <= 9999 ? String(parsed).padStart(4, "0") : rawCode.padStart(5, "0");
  const symbol = `${code}.HK`;
  return {
    id: symbol,
    symbol,
    name: `${symbol} Hong Kong Equity`,
    type: "stock",
    market: "hk",
    exchange: "HKEX",
    currency: "HKD",
    dataProvider: "yahoo",
    yahooSymbol: symbol,
    price: 100,
    change24h: 0,
    volume24h: 0,
    precision: 2
  };
}

export function inferChinaSymbol(normalized: string): MarketSymbol | null {
  const explicitSuffixMatch = normalized.match(/\.(SS|SZ|SH|BJ)$/);
  const code = normalized.replace(/\.(SS|SZ|SH|BJ)$/, "");
  if (!/^\d{6}$/.test(code)) return null;

  const explicitSuffix = explicitSuffixMatch?.[1] === "SH" ? "SS" : explicitSuffixMatch?.[1];
  const suffix = explicitSuffix || inferChinaExchangeSuffix(code);
  const exchange = suffix === "SS" ? "SSE" : suffix === "SZ" ? "SZSE" : "BSE";
  const symbol = `${code}.${suffix}`;

  return {
    id: symbol,
    symbol,
    name: `${symbol} China A-Share`,
    type: "stock",
    market: "cn",
    exchange,
    currency: "CNY",
    dataProvider: "yahoo",
    yahooSymbol: symbol,
    price: 100,
    change24h: 0,
    volume24h: 0,
    precision: 2
  };
}

export function inferChinaExchangeSuffix(code: string): "SS" | "SZ" | "BJ" {
  if (/^(5|6|9)/.test(code)) return "SS";
  if (/^(4|8)/.test(code)) return "BJ";
  return "SZ";
}

export function inferCryptoSymbol(normalized: string): MarketSymbol | null {
  if (!/^[A-Z0-9]{2,12}(USDT)?$/.test(normalized)) return null;
  const symbol = normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
  const base = symbol.replace(/USDT$/, "");
  return {
    id: `${base}/USDT`,
    symbol,
    name: `${base} / Tether`,
    type: "crypto",
    market: "crypto",
    exchange: "Binance",
    currency: "USDT",
    dataProvider: "binance",
    price: 100,
    change24h: 0,
    volume24h: 0,
    precision: 2
  };
}

export function inferForexSymbol(normalized: string): MarketSymbol | null {
  const symbol = normalized.replace("/", "").replace("=X", "");
  if (!/^[A-Z]{6}$/.test(symbol)) return null;

  return {
    id: normalized.includes("=X") ? `${symbol.slice(0, 3)}/${symbol.slice(3, 6)}` : normalized.includes("/") ? normalized : `${symbol.slice(0, 3)}/${symbol.slice(3, 6)}`,
    symbol,
    name: `${symbol.slice(0, 3)} / ${symbol.slice(3, 6)}`,
    type: "forex",
    market: "forex",
    exchange: "FX",
    currency: symbol.slice(3, 6),
    dataProvider: "yahoo",
    yahooSymbol: `${symbol}=X`,
    price: 1,
    change24h: 0,
    volume24h: 0,
    precision: 5
  };
}

export function inferInternationalEquitySymbol(normalized: string, market: "eu" | "jp" | "au"): MarketSymbol | null {
  const suffixMap = {
    jp: { suffixes: ["T"], exchange: "TSE", currency: "JPY", label: "Japan Equity" },
    au: { suffixes: ["AX"], exchange: "ASX", currency: "AUD", label: "Australia Equity" },
    eu: { suffixes: ["L", "PA", "DE", "MI", "AS", "SW"], exchange: "EU", currency: "EUR", label: "European Equity" }
  } as const;
  const config = suffixMap[market];
  const suffixes = config.suffixes.join("|");
  const suffixMatch = normalized.match(new RegExp(`\\.(${suffixes})$`));
  const rawCode = normalized.replace(new RegExp(`\\.(${suffixes})$`), "");

  if (!suffixMatch || !/^[A-Z0-9.-]{1,12}$/.test(rawCode)) return null;

  const suffix = suffixMatch[1];
  const symbol = `${rawCode}.${suffix}`;
  return {
    id: symbol,
    symbol,
    name: `${symbol} ${config.label}`,
    type: "stock",
    market,
    exchange: config.exchange,
    currency: config.currency,
    dataProvider: "yahoo",
    yahooSymbol: symbol,
    price: 100,
    change24h: 0,
    volume24h: 0,
    precision: 2
  };
}

export function inferUsSymbol(normalized: string): MarketSymbol | null {
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(normalized)) return null;
  if (/^[A-Z]{6}$/.test(normalized)) return null;

  return {
    id: normalized,
    symbol: normalized,
    name: `${normalized} US Equity`,
    type: "stock",
    market: "us",
    exchange: "US",
    currency: "USD",
    dataProvider: "yahoo",
    yahooSymbol: normalized,
    price: 100,
    change24h: 0,
    volume24h: 0,
    precision: 2
  };
}
