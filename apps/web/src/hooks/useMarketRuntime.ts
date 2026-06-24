import { useCallback, useEffect, useRef } from "react";
import { timeframeToSeconds } from "@shared/mockMarketData";
import { fetchMarketQuotes, loadMarketData, subscribeRealtime } from "@shared/marketDataService";
import type {
  AnalysisRunResponse,
  Candle,
  MarketDataStatus,
  MarketQuote,
  MarketSymbol
} from "@shared/types";
import { getFeedState } from "../services/marketRuntimeHelpers";

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
        setMarketStatus((prev) => ({
          state: "error",
          source: prev.source || "gateway",
          updatedAt: lastMarketUpdateRef.current,
          message: err instanceof Error ? err.message : "Quote gateway unavailable."
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
      setMarketStatus({
        state,
        source: activeQuote.source,
        provider: activeSymbol.exchange || activeSymbol.market,
        updatedAt: lastMarketUpdateRef.current,
        freshnessMs: Date.now() - lastMarketUpdateRef.current,
        message: activeQuote.isLive
          ? "Real market quote stream."
        : state === "delayed"
          ? "Delayed market quote from public market provider."
          : "Fallback simulated quote."
    });
  };

  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setCandles([]);
      setIsLiveBinanceActive(false);
      setAnalysisResult(null);
      setMarketStatus({
        state: "loading",
        source: "gateway",
        message: `Loading ${currentSymbol.id} ${timeframe} candles.`
      });

      const result = await loadMarketData(currentSymbol, timeframe);
      if (cancelled) return;

      setCandles(result.candles);
      setIsLiveBinanceActive(result.isLiveBinance);
      lastMarketUpdateRef.current = result.updatedAt;
      const state = getFeedState(result.source, result.isLiveBinance);
      setMarketStatus({
        state,
        source: result.source,
        provider: currentSymbol.exchange || currentSymbol.market,
        updatedAt: result.updatedAt,
        latencyMs: result.latencyMs,
        freshnessMs: Date.now() - result.updatedAt,
        message: result.isLiveBinance
          ? "Real candle gateway connected."
          : state === "delayed"
            ? "Delayed candle gateway connected."
            : "Fallback simulator active."
      });
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
        return { ...prev, state: "stale", message: `Market data delayed by ${Math.round(ageMs / 1000)}s.` };
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [setMarketStatus]);

  useEffect(() => {
    if (candles.length === 0) return;
    const subscription = subscribeRealtime(currentSymbol, timeframe, (tick) => {
      lastMarketUpdateRef.current = Date.now();
      const source = tick.source || (tick.isLive ? marketStatusRef.current.source : "simulated");
      const state = getFeedState(source, tick.isLive);
      updateSymbolsListPrice(currentSymbol.id, tick.close, { source, state, updatedAt: lastMarketUpdateRef.current });
      setMarketStatus((prev) => ({
        state,
        source: tick.source || (tick.isLive ? (prev.source === "simulated" ? "binance" : prev.source) : "simulated"),
        provider: currentSymbol.exchange || currentSymbol.market,
        updatedAt: lastMarketUpdateRef.current,
        freshnessMs: 0,
        message: tick.isLive
          ? "Realtime candle gateway connected."
          : state === "delayed"
            ? "Delayed candle gateway connected."
            : "Fallback simulator active."
      }));
      setCandles((prevCandles) => updateCandlesFromTick(prevCandles, tick, currentSymbol.precision, timeframe));
    });

    return () => {
      subscription.close();
    };
  }, [currentSymbol.id, currentSymbol.symbol, currentSymbol.type, currentSymbol.precision, timeframe, candles.length, updateSymbolsListPrice]);
}

function updateCandlesFromTick(prevCandles: Candle[], tick: any, precision: number, timeframe: string) {
  if (prevCandles.length === 0) return prevCandles;
  const lastCandle = prevCandles[prevCandles.length - 1];
  const secStep = timeframeToSeconds(timeframe);
  const candleTime = Math.floor(tick.time / secStep) * secStep;
  const close = Number(tick.close.toFixed(precision));

  if (candleTime > lastCandle.time) {
    const open = tick.isLive ? tick.open : lastCandle.close;
    const updatedCandle: Candle = {
      time: candleTime,
      open,
      high: Number(Math.max(open, tick.high, close).toFixed(precision)),
      low: Number(Math.min(open, tick.low, close).toFixed(precision)),
      close,
      volume: tick.volume
    };
    return [...prevCandles.slice(1), updatedCandle];
  }

  if (candleTime < lastCandle.time) return prevCandles;
  const updatedCandle: Candle = {
    ...lastCandle,
    high: Number(Math.max(lastCandle.high, tick.high, close).toFixed(precision)),
    low: Number(Math.min(lastCandle.low, tick.low, close).toFixed(precision)),
    close,
    volume: tick.isLive ? tick.volume : lastCandle.volume + tick.volume
  };
  return [...prevCandles.slice(0, -1), updatedCandle];
}
