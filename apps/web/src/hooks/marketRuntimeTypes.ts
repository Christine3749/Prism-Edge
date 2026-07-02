import type { AnalysisRunResponse, Candle, MarketDataStatus, MarketSymbol } from "@shared/types";

export interface UseMarketRuntimeParams {
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