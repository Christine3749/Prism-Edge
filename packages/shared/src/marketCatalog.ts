import { DEFAULT_SYMBOLS } from "./mockMarketData";
import {
  MAINSTREAM_MARKET_ORDER,
  MARKET_UNIVERSE_SYMBOLS
} from "./marketUniverse";
import type { MarketSymbol } from "./types";

function withDefaultMetadata(symbol: MarketSymbol): MarketSymbol {
  if (symbol.type === "crypto") {
    return {
      market: "crypto",
      exchange: symbol.symbol === "PRISMUSDT" ? "Prism" : "Binance",
      currency: "USDT",
      dataProvider: symbol.symbol === "PRISMUSDT" ? "simulated" : "binance",
      ...symbol
    };
  }

  if (symbol.type === "forex") {
    const symbolId = symbol.id.replace("/", "");
    return {
      market: "forex",
      exchange: "FX",
      currency: symbol.id.split("/")[1] || "USD",
      dataProvider: "yahoo",
      yahooSymbol: `${symbolId}=X`,
      ...symbol
    };
  }

  return {
    market: "us",
    exchange: "NASDAQ",
    currency: "USD",
    dataProvider: "yahoo",
    ...symbol
  };
}

export const MARKET_SYMBOLS: MarketSymbol[] = Array.from(
  new Map(
    [...DEFAULT_SYMBOLS.map(withDefaultMetadata), ...MARKET_UNIVERSE_SYMBOLS].map((symbol) => [
      symbol.symbol,
      symbol
    ])
  ).values()
);

const MAINSTREAM_SYMBOL_RANK = new Map<string, number>(
  MAINSTREAM_MARKET_ORDER.map((symbol, index) => [symbol, index])
);

const MARKET_GROUP_RANK: Record<NonNullable<MarketSymbol["market"]>, number> = {
  crypto: 0,
  us: 1,
  cn: 2,
  hk: 3,
  forex: 4,
  jp: 5,
  au: 6,
  eu: 7,
  internal: 8
};

function getSymbolRank(symbol: MarketSymbol): number {
  return MAINSTREAM_SYMBOL_RANK.get(symbol.symbol) ??
    MAINSTREAM_SYMBOL_RANK.get(symbol.id) ??
    1000;
}

function getMarketRank(symbol: MarketSymbol): number {
  const fallback = symbol.type === "forex" ? "forex" : symbol.type === "crypto" ? "crypto" : "us";
  return MARKET_GROUP_RANK[symbol.market || fallback] ?? 99;
}

export function sortMarketSymbols(symbols: MarketSymbol[]): MarketSymbol[] {
  return [...symbols].sort((a, b) => {
    const symbolRank = getSymbolRank(a) - getSymbolRank(b);
    if (symbolRank !== 0) return symbolRank;

    const marketRank = getMarketRank(a) - getMarketRank(b);
    if (marketRank !== 0) return marketRank;

    return a.symbol.localeCompare(b.symbol);
  });
}

export const DEFAULT_WATCHLIST_SYMBOLS: MarketSymbol[] = MAINSTREAM_MARKET_ORDER
  .map((symbol) => MARKET_SYMBOLS.find((item) => item.symbol === symbol || item.id === symbol))
  .filter((symbol): symbol is MarketSymbol => Boolean(symbol))
  .map((symbol) => ({ ...symbol }));

export function resolveMarketSymbol(input: string): MarketSymbol | undefined {
  const normalized = normalizeMarketInput(input);
  return MARKET_SYMBOLS.find((symbol) => (
    symbol.symbol.toUpperCase() === normalized ||
    symbol.id.toUpperCase() === normalized ||
    symbol.yahooSymbol?.toUpperCase() === normalized
  ));
}

export function normalizeMarketInput(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function isMarketSymbolSyntax(input: string): boolean {
  const normalized = normalizeMarketInput(input);
  return /^[A-Z0-9.^=\-/]{1,36}$/.test(normalized);
}

export function inferMarketSymbolFromInput(input: string): MarketSymbol | null {
  return inferMarketSymbolForMarket(input, "all");
}

export function inferMarketSymbolForMarket(input: string, market: string = "all"): MarketSymbol | null {
  const normalized = normalizeMarketInput(input);
  if (!isMarketSymbolSyntax(normalized)) return null;

  const known = resolveMarketSymbol(normalized);
  if (known) return known;

  const marketScope = market.toLowerCase();
  if (marketScope === "hk" || normalized.endsWith(".HK")) {
    const hkSymbol = inferHongKongSymbol(normalized);
    if (hkSymbol) return hkSymbol;
  }

  if (marketScope === "cn" || /\.(SS|SZ|SH|BJ)$/.test(normalized)) {
    const cnSymbol = inferChinaSymbol(normalized);
    if (cnSymbol) return cnSymbol;
  }

  if (marketScope === "crypto") {
    const cryptoSymbol = inferCryptoSymbol(normalized);
    if (cryptoSymbol) return cryptoSymbol;
  }

  const isForex = /^[A-Z]{6}=X$/.test(normalized) ||
    /^[A-Z]{6}$/.test(normalized) ||
    /^[A-Z]{3}\/[A-Z]{3}$/.test(normalized);
  if (marketScope === "forex" || isForex) {
    const forexSymbol = inferForexSymbol(normalized);
    if (forexSymbol) return forexSymbol;
  }

  if (marketScope === "jp" || normalized.endsWith(".T")) {
    const jpSymbol = inferInternationalEquitySymbol(normalized, "jp");
    if (jpSymbol) return jpSymbol;
  }

  if (marketScope === "au" || normalized.endsWith(".AX")) {
    const auSymbol = inferInternationalEquitySymbol(normalized, "au");
    if (auSymbol) return auSymbol;
  }

  if (marketScope === "eu" || /\.(L|PA|DE|MI|AS|SW)$/.test(normalized)) {
    const euSymbol = inferInternationalEquitySymbol(normalized, "eu");
    if (euSymbol) return euSymbol;
  }

  if (marketScope === "us" || marketScope === "all") {
    const usSymbol = inferUsSymbol(normalized);
    if (usSymbol) return usSymbol;
  }

  return null;
}

function inferHongKongSymbol(normalized: string): MarketSymbol | null {
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

function inferChinaSymbol(normalized: string): MarketSymbol | null {
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

function inferChinaExchangeSuffix(code: string): "SS" | "SZ" | "BJ" {
  if (/^(5|6|9)/.test(code)) return "SS";
  if (/^(4|8)/.test(code)) return "BJ";
  return "SZ";
}

function inferCryptoSymbol(normalized: string): MarketSymbol | null {
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

function inferForexSymbol(normalized: string): MarketSymbol | null {
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

function inferInternationalEquitySymbol(normalized: string, market: "eu" | "jp" | "au"): MarketSymbol | null {
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

function inferUsSymbol(normalized: string): MarketSymbol | null {
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

export function searchMarketSymbols(query: string, market: string = "all", limit = 50): MarketSymbol[] {
  const normalized = query.trim().toLowerCase();
  const matches = MARKET_SYMBOLS.filter((symbol) => {
    const matchesMarket = market === "all" || symbol.market === market || symbol.type === market;
    if (!matchesMarket) return false;
    if (!normalized) return true;

    return (
      symbol.id.toLowerCase().includes(normalized) ||
      symbol.symbol.toLowerCase().includes(normalized) ||
      symbol.name.toLowerCase().includes(normalized) ||
      (symbol.exchange || "").toLowerCase().includes(normalized)
    );
  });

  const inferred = inferMarketSymbolForMarket(query, market);
  if (inferred && !matches.some((symbol) => symbol.symbol === inferred.symbol)) {
    matches.unshift(inferred);
  }

  return sortMarketSymbols(matches).slice(0, limit);
}
