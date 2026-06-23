import { MarketSymbol } from "./types";
import { DEFAULT_SYMBOLS } from "./mockMarketData";

const EXPANDED_MARKET_SYMBOLS: MarketSymbol[] = [
  { id: "SPY", symbol: "SPY", name: "SPDR S&P 500 ETF", type: "stock", market: "us", exchange: "NYSE Arca", currency: "USD", dataProvider: "yahoo", price: 548.3, change24h: 0.28, volume24h: 70200000, precision: 2 },
  { id: "QQQ", symbol: "QQQ", name: "Invesco QQQ Trust", type: "stock", market: "us", exchange: "NASDAQ", currency: "USD", dataProvider: "yahoo", price: 477.12, change24h: 0.46, volume24h: 46300000, precision: 2 },
  { id: "AMZN", symbol: "AMZN", name: "Amazon.com Inc.", type: "stock", market: "us", exchange: "NASDAQ", currency: "USD", dataProvider: "yahoo", price: 184.91, change24h: 0.34, volume24h: 35600000, precision: 2 },
  { id: "META", symbol: "META", name: "Meta Platforms Inc.", type: "stock", market: "us", exchange: "NASDAQ", currency: "USD", dataProvider: "yahoo", price: 512.7, change24h: 0.52, volume24h: 12100000, precision: 2 },
  { id: "GOOGL", symbol: "GOOGL", name: "Alphabet Inc.", type: "stock", market: "us", exchange: "NASDAQ", currency: "USD", dataProvider: "yahoo", price: 176.11, change24h: 0.18, volume24h: 24200000, precision: 2 },
  { id: "^GSPC", symbol: "^GSPC", name: "S&P 500 Index", type: "stock", market: "us", exchange: "SNP", currency: "USD", dataProvider: "yahoo", price: 5487.0, change24h: 0.31, volume24h: 0, precision: 2 },
  { id: "^IXIC", symbol: "^IXIC", name: "NASDAQ Composite", type: "stock", market: "us", exchange: "NASDAQ", currency: "USD", dataProvider: "yahoo", price: 17689.0, change24h: 0.45, volume24h: 0, precision: 2 },
  { id: "^DJI", symbol: "^DJI", name: "Dow Jones Industrial Average", type: "stock", market: "us", exchange: "DJI", currency: "USD", dataProvider: "yahoo", price: 39150.0, change24h: 0.18, volume24h: 0, precision: 2 },

  { id: "000001.SZ", symbol: "000001.SZ", name: "平安银行", type: "stock", market: "cn", exchange: "SZSE", currency: "CNY", dataProvider: "yahoo", price: 10.7, change24h: 0.19, volume24h: 72000000, precision: 2 },
  { id: "000002.SZ", symbol: "000002.SZ", name: "万科A", type: "stock", market: "cn", exchange: "SZSE", currency: "CNY", dataProvider: "yahoo", price: 7.12, change24h: -0.42, volume24h: 138000000, precision: 2 },
  { id: "002415.SZ", symbol: "002415.SZ", name: "海康威视", type: "stock", market: "cn", exchange: "SZSE", currency: "CNY", dataProvider: "yahoo", price: 31.44, change24h: 0.58, volume24h: 46300000, precision: 2 },
  { id: "300750.SZ", symbol: "300750.SZ", name: "宁德时代", type: "stock", market: "cn", exchange: "SZSE", currency: "CNY", dataProvider: "yahoo", price: 195.2, change24h: 1.18, volume24h: 35200000, precision: 2 },
  { id: "399001.SZ", symbol: "399001.SZ", name: "深证成指", type: "stock", market: "cn", exchange: "SZSE", currency: "CNY", dataProvider: "yahoo", price: 10320.0, change24h: 0.36, volume24h: 0, precision: 2 },
  { id: "399006.SZ", symbol: "399006.SZ", name: "创业板指", type: "stock", market: "cn", exchange: "SZSE", currency: "CNY", dataProvider: "yahoo", price: 2080.0, change24h: 0.48, volume24h: 0, precision: 2 },
  { id: "600519.SS", symbol: "600519.SS", name: "贵州茅台", type: "stock", market: "cn", exchange: "SSE", currency: "CNY", dataProvider: "yahoo", price: 1510.0, change24h: 0.24, volume24h: 3850000, precision: 2 },
  { id: "600036.SS", symbol: "600036.SS", name: "招商银行", type: "stock", market: "cn", exchange: "SSE", currency: "CNY", dataProvider: "yahoo", price: 34.8, change24h: 0.39, volume24h: 66000000, precision: 2 },
  { id: "000001.SS", symbol: "000001.SS", name: "上证指数", type: "stock", market: "cn", exchange: "SSE", currency: "CNY", dataProvider: "yahoo", price: 3020.0, change24h: 0.22, volume24h: 0, precision: 2 },

  { id: "0700.HK", symbol: "0700.HK", name: "Tencent Holdings", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 382.4, change24h: 0.86, volume24h: 21800000, precision: 2 },
  { id: "9988.HK", symbol: "9988.HK", name: "Alibaba Group Holding", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 75.6, change24h: 0.42, volume24h: 61200000, precision: 2 },
  { id: "3690.HK", symbol: "3690.HK", name: "Meituan", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 114.2, change24h: 1.16, volume24h: 39100000, precision: 2 },
  { id: "9618.HK", symbol: "9618.HK", name: "JD.com Inc.", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 105.8, change24h: -0.26, volume24h: 12800000, precision: 2 },
  { id: "1299.HK", symbol: "1299.HK", name: "AIA Group", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 56.15, change24h: 0.51, volume24h: 28900000, precision: 2 },
  { id: "0005.HK", symbol: "0005.HK", name: "HSBC Holdings", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 68.35, change24h: -0.18, volume24h: 22300000, precision: 2 },
  { id: "^HSI", symbol: "^HSI", name: "Hang Seng Index", type: "stock", market: "hk", exchange: "HKEX", currency: "HKD", dataProvider: "yahoo", price: 18280.0, change24h: 0.24, volume24h: 0, precision: 2 },
];

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
    return {
      market: "forex",
      exchange: "FX",
      currency: symbol.id.split("/")[1] || "USD",
      dataProvider: "yahoo",
      yahooSymbol: `${symbol.symbol}=X`,
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
    [...DEFAULT_SYMBOLS.map(withDefaultMetadata), ...EXPANDED_MARKET_SYMBOLS].map((symbol) => [
      symbol.symbol,
      symbol
    ])
  ).values()
);

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
  return /^[A-Z0-9.^=\-/]{1,32}$/.test(normalized);
}

export function inferMarketSymbolFromInput(input: string): MarketSymbol | null {
  const normalized = normalizeMarketInput(input);
  if (!isMarketSymbolSyntax(normalized)) return null;
  if (/^\d+$/.test(normalized)) return null;

  const known = resolveMarketSymbol(normalized);
  if (known) return known;

  const isForex = /^[A-Z]{6}=X$/.test(normalized) || /^[A-Z]{6}$/.test(normalized) || /^[A-Z]{3}\/[A-Z]{3}$/.test(normalized);
  const symbol = normalized.replace("/", "").replace("=X", "");
  const hk = normalized.endsWith(".HK");
  const sz = normalized.endsWith(".SZ");
  const ss = normalized.endsWith(".SS");
  const isIndex = normalized.startsWith("^");
  const market = hk ? "hk" : (sz || ss ? "cn" : isForex ? "forex" : "us");
  const exchange = hk ? "HKEX" : sz ? "SZSE" : ss ? "SSE" : isIndex ? "Index" : isForex ? "FX" : "US";
  const currency = hk ? "HKD" : (sz || ss ? "CNY" : isForex ? symbol.slice(3, 6) : "USD");

  return {
    id: normalized.includes("=X") ? `${symbol.slice(0, 3)}/${symbol.slice(3, 6)}` : normalized,
    symbol,
    name: `${normalized} Market Instrument`,
    type: isForex ? "forex" : "stock",
    market,
    exchange,
    currency,
    dataProvider: "yahoo",
    yahooSymbol: isForex ? `${symbol}=X` : normalized,
    price: isForex ? 1 : 100,
    change24h: 0,
    volume24h: 0,
    precision: isForex ? 5 : 2
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

  const inferred = inferMarketSymbolFromInput(query);
  if (inferred && !matches.some((symbol) => symbol.symbol === inferred.symbol)) {
    matches.unshift(inferred);
  }

  return matches.slice(0, limit);
}
