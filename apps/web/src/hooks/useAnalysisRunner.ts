import { useEffect } from "react";
import type { AnalysisRunResponse, Candle, IndicatorConfig, MarketSymbol } from "@shared/types";
import { hsFetch, readHsAccessToken } from "@shared/hsAuth";
import { buildActiveIndicatorList } from "../services/marketRuntimeHelpers";

interface UseAnalysisRunnerParams {
  candles: Candle[];
  currentSymbol: MarketSymbol;
  timeframe: string;
  indicatorConfig: IndicatorConfig;
  setAnalysisResult: (result: AnalysisRunResponse | null) => void;
}

export function useAnalysisRunner({
  candles,
  currentSymbol,
  timeframe,
  indicatorConfig,
  setAnalysisResult
}: UseAnalysisRunnerParams) {
  const hsAccessToken = readHsAccessToken();

  useEffect(() => {
    if (!hsAccessToken) {
      setAnalysisResult(null);
      return;
    }
    if (candles.length < 30) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await hsFetch("/api/analysis/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: currentSymbol.id,
            interval: timeframe,
            candles,
            indicators: buildActiveIndicatorList(indicatorConfig)
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) setAnalysisResult(null);
          return;
        }
        const data = await response.json() as AnalysisRunResponse;
        setAnalysisResult(data);
      } catch {
        if (!controller.signal.aborted) setAnalysisResult(null);
      }
    }, 650);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    hsAccessToken,
    currentSymbol.id,
    timeframe,
    candles.length,
    indicatorConfig.sma.active,
    indicatorConfig.ema.active,
    indicatorConfig.rsi.active,
    indicatorConfig.macd.active,
    indicatorConfig.bollinger.active,
    setAnalysisResult
  ]);
}