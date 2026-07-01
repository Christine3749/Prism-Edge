import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMarketQuotes, loadMarketData, subscribeRealtime, updateCandlesFromTick } from "@shared/marketDataService";
import type {
  AnalysisRunResponse,
  Candle,
  MarketDataStatus,
  MarketQuote,
  MarketSymbol
} from "@shared/types";
import { buildMarketStatus, getFeedState } from "../services/marketRuntimeHelpers";

interface UseMarketRuntimeParams {
  candles: Candle[];
  currentSymbol: MarketSymbol;
  timeframe: string;
  symbolsList: MarketSymbol[];
  marketStatus: MarketDataStatus;
  setCandles: React.Dispatch<React.SetStateAction<Candle[]>>;
  setCurrentSymbol: React.Dispatch<React.SetStateAction<MarketSymbol>>;
  setSymbolsList: React.Dispatch<React.SetStateAction<MarketSymbol[]>>;
  setMarketStatus: React.Dispatch<React.SetStateAction<MarketDataStatus>>;
  setIsLiveBinanceActive: React.Dispatch<React.SetStateAction<boolean>>;
  setAnalysisResult: React.Dispatch<React.SetStateAction<AnalysisRunResponse | null>>;
}

export function useMarketRuntime(params: UseMarketRuntimeParams) {
  const {
    candles,
    currentSymbol,
    timeframe,
    symbolsList,
    marketStatus,
    setCandles,
    setCurrentSymbol,
    setSymbolsList,
    setMarketStatus,
    setIsLiveBinanceActive,
    setAnalysisResult
  } = params;

  const symbolsListRef = useRef(symbolsList);
  const currentSymbolRef = useRef(currentSymbol);
  const marketStatusRef = useRef(marketStatus);
  const lastMarketUpdateRef = useRef(Date.now());
  const quoteRefreshInFlightRef = useRef(false);
  const historyRequestRef = useRef<{ symbolId: string; timeframe: string } | null>(null);
  const [historyReadyKey, setHistoryReadyKey] = useState("");

  useEffect(() => {
    symbolsListRef.current = symbolsList;
  }, [symbolsList]);

  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);

  useEffect(() => {
    marketStatusRef.current = marketStatus;
  }, [marketStatus]);

  const updateSymbolsListPrice = useCallback((
    symbolId: string,
    nextPrice: number,
    feed?: { source: string; state: MarketDataStatus["state"]; updatedAt: number }
  ) => {
    const applyPrice = (sym: MarketSymbol): MarketSymbol => {
      const firstPrice = sym.price - (sym.price * (sym.change24h / 100));
      const diff = nextPrice - firstPrice;
      const nextChange = firstPrice !== 0 ? (diff / firstPrice) * 100 : 0;
      return {
        ...sym,
        price: Number(nextPrice.toFixed(sym.precision)),
        change24h: Number(nextChange.toFixed(2)),
        lastSource: feed?.source || sym.lastSource,
        lastDataState: feed?.state || sym.lastDataState,
        lastUpdatedAt: feed?.updatedAt || sym.lastUpdatedAt
      };
    };

    setSymbolsList((prev) => prev.map((sym) => (sym.id === symbolId ? applyPrice(sym) : sym)));
    setCurrentSymbol((prev) => (prev.id === symbolId ? applyPrice(prev) : prev));
  }, [setCurrentSymbol, setSymbolsList]);

  const applyQuotes = useCallback((quotes: MarketQuote[]) => {
    const quoteMap = new Map(quotes.map((quote) => [quote.symbol, quote]));
    const applyToSymbol = (sym: MarketSymbol): MarketSymbol => {
      const quote = quoteMap.get(sym.symbol);
      if (!quote) return sym;
      const state = getFeedState(quote.source, quote.isLive);
      const nextPrice = Number(quote.price.toFixed(sym.precision));
      const nextChange = Number(quote.change24h.toFixed(2));
      const nextVolume = Math.round(quote.volume24h);

      if (
        sym.price === nextPrice &&
        sym.change24h === nextChange &&
        sym.volume24h === nextVolume &&
        sym.lastSource === quote.source &&
        sym.lastDataState === state
      ) {
        return sym;
      }

      return {
        ...sym,
        price: nextPrice,
        change24h: nextChange,
        volume24h: nextVolume,
        lastSource: quote.source,
        lastDataState: state,
        lastUpdatedAt: quote.updatedAt
      };
    };

    setSymbolsList((prev) => prev.map(applyToSymbol));
    setCurrentSymbol((prev) => applyToSymbol(prev));
  }, [setCurrentSymbol, setSymbolsList]);

  const refreshQuotes = useCallback(async (quiet = false) => {
    if (quoteRefreshInFlightRef.current) return;
    quoteRefreshInFlightRef.current = true;

    try {
      const quotes = await fetchMarketQuotes(symbolsListRef.current);
      applyQuotes(quotes);
      updateActiveQuoteStatus(quotes);
    } catch (err) {
      if (!quiet) {
        setMarketStatus((prev) => buildMarketStatus({
          state: "error",
          source: prev.source || "gateway",
          provider: currentSymbolRef.current.exchange || currentSymbolRef.current.market,
          updatedAt: lastMarketUpdateRef.current,
          reason: err instanceof Error ? err.message : "Quote gateway unavailable."
        }));
      }
    } finally {
      quoteRefreshInFlightRef.current = false;
    }
  }, [applyQuotes, setMarketStatus]);

  const updateActiveQuoteStatus = (quotes: MarketQuote[]) => {
    const activeSymbol = currentSymbolRef.current;
    const activeQuote = quotes.find((quote) => quote.symbol === activeSymbol.symbol);
    if (!activeQuote) return;

    const state = getFeedState(activeQuote.source, activeQuote.isLive);
    lastMarketUpdateRef.current = activeQuote.updatedAt || Date.now();
    setIsLiveBinanceActive(activeQuote.isLive);
    setMarketStatus(buildMarketStatus({
      state,
      source: activeQuote.source,
      provider: activeSymbol.exchange || activeSymbol.market,
      updatedAt: lastMarketUpdateRef.current,
      freshnessMs: Date.now() - lastMarketUpdateRef.current,
      reason: activeQuote.isLive
        ? "Real quote stream is fresh."
        : state === "delayed"
          ? "Quote is coming from a public delayed provider."
          : "Quote gateway fell back to simulated protection."
    }));
  };

  useEffect(() => {
    let cancelled = false;
    const requestKey = `${currentSymbol.id}:${timeframe}`;
    const previousRequest = historyRequestRef.current;
    const isNewSymbol = previousRequest?.symbolId !== currentSymbol.id;
    const shouldClearBeforeFetch = isNewSymbol || !canUseSimulatedRuntime(currentSymbol);
    historyRequestRef.current = { symbolId: currentSymbol.id, timeframe };

    const fetchHistory = async () => {
      setHistoryReadyKey("");
      if (shouldClearBeforeFetch) setCandles([]);
      setIsLiveBinanceActive(false);
      setAnalysisResult(null);
      setMarketStatus(buildMarketStatus({
        state: "loading",
        source: "gateway",
        provider: currentSymbol.exchange || currentSymbol.market,
        reason: shouldClearBeforeFetch
          ? `Loading ${currentSymbol.id} ${timeframe} candles.`
          : `Loading ${currentSymbol.id} ${timeframe} candles; preserving the current view until the new history arrives.`
      }));

      try {
        const result = await loadMarketData(currentSymbol, timeframe);
        if (cancelled) return;

        setCandles(result.candles);
        setHistoryReadyKey(requestKey);
        setIsLiveBinanceActive(result.isLiveBinance);
        lastMarketUpdateRef.current = result.updatedAt;
        const state = getFeedState(result.source, result.isLiveBinance);
        setMarketStatus(buildMarketStatus({
          state,
          source: result.source,
          provider: currentSymbol.exchange || currentSymbol.market,
          updatedAt: result.updatedAt,
          latencyMs: result.latencyMs,
          freshnessMs: Date.now() - result.updatedAt,
          route: result.route,
          reason: result.isLiveBinance
            ? "Real candle gateway connected."
            : state === "delayed"
              ? "Delayed candle gateway connected."
              : result.fallbackReason || "Fallback simulator active because the market gateway did not return usable candles."
        }));
      } catch (err) {
        if (cancelled) return;
        setCandles([]);
        setHistoryReadyKey("");
        setIsLiveBinanceActive(false);
        const reason = err instanceof Error ? err.message : "Verified market candles are unavailable.";
        setMarketStatus(buildMarketStatus({
          state: "error",
          source: "unavailable",
          provider: currentSymbol.exchange || currentSymbol.market,
          updatedAt: Date.now(),
          reason
        }));
      }
    };

    fetchHistory();
    return () => {
      cancelled = true;
    };
  }, [currentSymbol.id, timeframe]);

  useEffect(() => {
    refreshQuotes(true);
    const timer = window.setInterval(() => refreshQuotes(true), 5000);
    const refreshOnFocus = () => refreshQuotes(true);
    window.addEventListener("focus", refreshOnFocus);
    window.addEventListener("online", refreshOnFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
      window.removeEventListener("online", refreshOnFocus);
    };
  }, [currentSymbol.symbol, refreshQuotes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const ageMs = Date.now() - lastMarketUpdateRef.current;
      setMarketStatus((prev) => {
        if (prev.state === "loading" || prev.state === "error") return prev;
        if (ageMs <= 22000) return prev;
        return buildMarketStatus({ ...prev, state: "stale", reason: `No fresh market update for ${Math.round(ageMs / 1000)}s.` });
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [setMarketStatus]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const status = marketStatusRef.current;
      if (!shouldRunLocalMarketPulse(status, currentSymbolRef.current)) return;

      const now = Date.now();
      const activeId = currentSymbolRef.current.id;
      setSymbolsList((prev) => prev.map((symbol, index) => pulseMarketSymbol(symbol, index, now, activeId)));
      setCurrentSymbol((prev) => pulseMarketSymbol(prev, stableSymbolSeed(prev.symbol), now, prev.id));
      lastMarketUpdateRef.current = now;
      setMarketStatus((prev) => buildMarketStatus({
        ...prev,
        state: "simulated",
        source: prev.source?.toLowerCase().includes("sim") ? prev.source : "local-sim",
        provider: currentSymbolRef.current.exchange || currentSymbolRef.current.market,
        updatedAt: now,
        freshnessMs: 0,
        reason: "External feed is stale or unavailable; local simulator is keeping the terminal responsive."
      }));
    }, 1800);

    return () => window.clearInterval(timer);
  }, [setCurrentSymbol, setMarketStatus, setSymbolsList]);

  useEffect(() => {
    if (candles.length === 0) return;
    if (historyReadyKey !== `${currentSymbol.id}:${timeframe}`) return;
    const subscription = subscribeRealtime(currentSymbol, timeframe, (tick) => {
      lastMarketUpdateRef.current = Date.now();
      const source = tick.source || (tick.isLive ? marketStatusRef.current.source : "simulated");
      const state = getFeedState(source, tick.isLive);
      updateSymbolsListPrice(currentSymbol.id, tick.close, { source, state, updatedAt: lastMarketUpdateRef.current });
      setMarketStatus((prev) => buildMarketStatus({
        state,
        source: tick.source || (tick.isLive ? (prev.source === "simulated" ? "binance" : prev.source) : "simulated"),
        provider: currentSymbol.exchange || currentSymbol.market,
        updatedAt: lastMarketUpdateRef.current,
        freshnessMs: 0,
        reason: tick.isLive
          ? "Realtime candle gateway connected."
          : state === "delayed"
            ? "Delayed candle gateway connected."
            : "Realtime stream fell back to simulator protection."
      }));
      setCandles((prevCandles) => updateCandlesFromTick(prevCandles, tick, currentSymbol.precision, timeframe));
    });

    return () => {
      subscription.close();
    };
  }, [currentSymbol.id, currentSymbol.symbol, currentSymbol.type, currentSymbol.precision, timeframe, candles.length, historyReadyKey, updateSymbolsListPrice]);
}


function canUseSimulatedRuntime(symbol?: MarketSymbol) {
  return symbol?.dataProvider === "simulated" || symbol?.market === "internal";
}

function shouldRunLocalMarketPulse(status: MarketDataStatus | undefined, symbol?: MarketSymbol) {
  if (!status || !canUseSimulatedRuntime(symbol)) return false;
  const source = (status.source || "").toLowerCase();
  return status.state === "simulated" || source.includes("simulated") || source.includes("local-sim");
}

function pulseMarketSymbol(symbol: MarketSymbol, index: number, now: number, activeId: string): MarketSymbol {
  if (!Number.isFinite(symbol.price) || symbol.price <= 0) return symbol;

  const seed = stableSymbolSeed(symbol.symbol || symbol.id) + index * 17;
  const wave = Math.sin(now / 1450 + seed * 0.73);
  const micro = Math.sin(now / 670 + seed * 1.31);
  const jitter = Math.random() - 0.5;
  const baseAmplitude = symbol.type === "forex" ? 0.00028 : symbol.type === "crypto" ? 0.0019 : 0.0011;
  const focusBoost = symbol.id === activeId ? 1.35 : 1;
  const percentMove = (wave * 0.38 + micro * 0.22 + jitter * 0.42) * baseAmplitude * focusBoost;
  const minPrice = Math.pow(10, -Math.max(symbol.precision, 2));
  const nextPrice = Math.max(minPrice, symbol.price * (1 + percentMove));
  const nextChange = clampNumber(symbol.change24h + percentMove * 420, -18, 18);
  const volumePulse = 1 + Math.abs(percentMove) * 40 + Math.max(-0.006, Math.min(0.009, jitter * 0.01));

  return {
    ...symbol,
    price: Number(nextPrice.toFixed(symbol.precision)),
    change24h: Number(nextChange.toFixed(2)),
    volume24h: Math.max(0, Math.round(symbol.volume24h * volumePulse)),
    lastSource: "local-sim",
    lastDataState: "simulated",
    lastUpdatedAt: now
  };
}

function stableSymbolSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % 997;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

