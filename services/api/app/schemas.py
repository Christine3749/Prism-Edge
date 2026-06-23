from typing import Literal

from pydantic import BaseModel, Field


AnalysisTrend = Literal["bullish", "bearish", "neutral"]
AnalysisSignalType = Literal["buy", "sell", "watch"]


class Candle(BaseModel):
    time: int = Field(..., description="Unix timestamp in seconds")
    open: float
    high: float
    low: float
    close: float
    volume: float


class AnalysisRunRequest(BaseModel):
    symbol: str = Field(..., examples=["BTC/USDT"])
    interval: str = Field(..., examples=["1h"])
    candles: list[Candle] = Field(..., min_length=1)
    indicators: list[str] = Field(default_factory=list, examples=[["SMA", "EMA", "RSI", "MACD"]])


class AnalysisSignal(BaseModel):
    type: AnalysisSignalType
    time: int
    price: float
    label: str
    confidence: float | None = None


class AnalysisLevels(BaseModel):
    support: list[float]
    resistance: list[float]


class AnalysisMeta(BaseModel):
    engine: str
    generatedAt: str
    candleCount: int


class AnalysisRunResponse(BaseModel):
    trend: AnalysisTrend
    confidence: float = Field(..., ge=0, le=1)
    signals: list[AnalysisSignal]
    levels: AnalysisLevels
    summary: str
    meta: AnalysisMeta
