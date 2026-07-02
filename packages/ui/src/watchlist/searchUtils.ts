import { inferMarketSymbolForMarket } from "@shared/marketCatalog";
import type { MarketSymbol } from "@shared/types";
import type { WatchlistFilter } from "./types";
import { getMarketDisplayName } from "./providerMeta";

export function buildSearchSuggestions(query: string, symbols: MarketSymbol[]) {
  if (!query || symbols.length > 0) return [];

  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  const candidates: Array<[string, string]> = [];

  if (/^\d{1,5}$/.test(normalized)) {
    candidates.push([`${normalized}.HK`, "hk"]);
    if (/^\d{4}$/.test(normalized)) candidates.push([`${normalized}.T`, "jp"]);
  }
  if (/^\d{6}$/.test(normalized)) {
    candidates.push([`${normalized}.SS`, "cn"], [`${normalized}.SZ`, "cn"], [`${normalized}.BJ`, "cn"]);
  }
  if (/^[A-Z]{1,6}$/.test(normalized)) {
    candidates.push([normalized, "us"]);
    if (normalized.length >= 2) {
      candidates.push([`${normalized}.L`, "eu"], [`${normalized}.PA`, "eu"], [`${normalized}.AX`, "au"]);
      candidates.push([`${normalized}USDT`, "crypto"]);
    }
  }
  if (/^[A-Z]{6}$/.test(normalized) || /^[A-Z]{3}\/[A-Z]{3}$/.test(normalized)) {
    candidates.push([normalized, "forex"]);
  }

  const suggestions = new Map<string, MarketSymbol>();
  candidates.forEach(([value, market]) => {
    const inferred = inferMarketSymbolForMarket(value, market);
    if (inferred && !suggestions.has(inferred.symbol)) {
      suggestions.set(inferred.symbol, inferred);
    }
  });

  return Array.from(suggestions.values()).slice(0, 6);
}

export function getSearchInsight(symbols: MarketSymbol[], query: string, loading: boolean, zh: boolean) {
  if (!query) return null;
  const intent = describeSearchIntent(query, zh);
  if (loading) {
    return {
      marketLabel: zh ? "识别中" : "Detecting",
      detail: zh ? "本地目录 + 远程 Provider" : "Catalog + provider search",
      reason: intent
    };
  }

  const first = symbols[0];
  if (!first) {
    return {
      marketLabel: zh ? "待确认" : "No match",
      detail: zh ? "没有命中，下面给后缀建议" : "No hit; suffix suggestions below",
      reason: intent
    };
  }

  const marketLabel = getMarketDisplayName(first.market || first.type, zh);
  const uniqueMarkets = new Set(symbols.map((symbol) => getMarketDisplayName(symbol.market || symbol.type, zh)));
  const exactMatch = symbols.find((symbol) => {
    const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
    return symbol.id.toUpperCase() === normalized || symbol.symbol.toUpperCase() === normalized || symbol.yahooSymbol?.toUpperCase() === normalized;
  });
  const reason = getSymbolMatchReason(exactMatch || first, query, zh);
  return {
    marketLabel: uniqueMarkets.size === 1 ? marketLabel : (zh ? "多市场" : "Multi-market"),
    detail: zh
      ? `${exactMatch ? "精确" : "首选"} ${first.id} · ${symbols.length} 个候选`
      : `${exactMatch ? "Exact" : "Top"} ${first.id} · ${symbols.length} candidates`,
    reason: zh ? `${reason}；${intent}` : `${reason}; ${intent}`
  };
}

export function getSymbolMatchReason(symbol: MarketSymbol, query: string, zh: boolean) {
  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  const market = (symbol.market || symbol.type || "").toLowerCase();
  const exchange = String(symbol.exchange || "").toUpperCase();

  if (market === "hk") return zh ? (normalized.includes(".HK") ? "因 .HK 后缀识别为港股" : "因数字代码/HKEX 规则识别为港股") : (normalized.includes(".HK") ? "matched .HK suffix" : "matched HKEX numeric ticker rule");
  if (market === "cn") return zh ? (/(\.SS|\.SZ|\.BJ)$/.test(normalized) ? "因 A 股交易所后缀识别" : "因 6 位数字代码识别为 A 股") : (/(\.SS|\.SZ|\.BJ)$/.test(normalized) ? "matched China exchange suffix" : "matched 6-digit A-share ticker");
  if (market === "forex") return zh ? "因 6 位货币对或 XXX/YYY 结构识别为外汇" : "matched 6-letter currency pair or XXX/YYY format";
  if (market === "crypto") return zh ? "因 USDT/Binance 交易对规则识别为 Crypto" : "matched USDT/Binance crypto pair rule";
  if (market === "jp" || exchange === "TSE") return zh ? "因 .T 后缀识别为日本市场" : "matched .T suffix for Japan";
  if (market === "au" || exchange === "ASX") return zh ? "因 .AX 后缀识别为澳洲市场" : "matched .AX suffix for Australia";
  if (market === "eu") return zh ? "因欧洲交易所后缀识别" : "matched European exchange suffix";
  if (market === "us" || exchange === "NASDAQ" || exchange === "NYSE") return zh ? "因美股代码形态或 NASDAQ/NYSE 结果识别" : "matched US ticker shape or NASDAQ/NYSE result";
  return zh ? "由市场目录/远程搜索结果识别" : "identified by catalog or remote search";
}

export function matchesWatchlistSymbol(
  sym: MarketSymbol,
  filter: WatchlistFilter,
  favoriteSet: Set<string>,
  normalizedQuery: string
) {
  const symbolMarket = (sym.market || sym.type || "").toLowerCase();
  const isFavorite = favoriteSet.has(sym.symbol);
  const matchesFilter = filter === "favorites"
    ? isFavorite
    : filter === "all" ||
      (filter === "crypto" && (symbolMarket === "crypto" || sym.type === "crypto")) ||
      (filter === "forex" && (symbolMarket === "forex" || sym.type === "forex")) ||
      symbolMarket === filter;
  const matchesQuery = normalizedQuery.length === 0 ||
    sym.id.toLowerCase().includes(normalizedQuery) ||
    sym.symbol.toLowerCase().includes(normalizedQuery) ||
    sym.name.toLowerCase().includes(normalizedQuery) ||
    String(sym.exchange || "").toLowerCase().includes(normalizedQuery);
  return matchesFilter && matchesQuery;
}

function describeSearchIntent(query: string, zh: boolean) {
  const normalized = query.trim().toUpperCase().replace(/\s+/g, "");
  if (/^[A-Z]{3}\/?[A-Z]{3}$/.test(normalized)) return zh ? "输入结构像货币对，会优先按外汇识别。" : "Looks like a currency pair, so FX is prioritized.";
  if (/^\d{6}(\.(SS|SZ|SH|BJ))?$/.test(normalized)) return zh ? "6 位数字会优先按 A 股规则补全交易所后缀。" : "Six digits are completed with China exchange suffix rules.";
  if (/^\d{4,5}(\.HK)?$/.test(normalized)) return zh ? "4-5 位数字会优先检查港股；4 位也会建议日本 .T。" : "4-5 digits check HK first; 4 digits also suggest Japan .T.";
  if (/\.(T|AX|L|PA|DE|MI|AS|SW)$/.test(normalized)) return zh ? "交易所后缀会直接决定日本、澳洲或欧洲市场。" : "Exchange suffix decides Japan, Australia, or Europe directly.";
  if (/^[A-Z]{1,6}$/.test(normalized)) return zh ? "字母代码默认先查美股，同时给 Crypto/欧洲/澳洲候选。" : "Plain tickers check US first, with Crypto/Europe/Australia fallbacks.";
  return zh ? "先查本地目录，再请求远程 Provider 补全。" : "Local catalog first, then provider search expands candidates.";
}
