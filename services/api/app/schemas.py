from typing import Literal

from pydantic import BaseModel, Field


AnalysisTrend = Literal["bullish", "bearish", "neutral"]
AnalysisSignalType = Literal["buy", "sell", "watch"]
QuantRegime = Literal["trend", "range", "breakout", "stress", "transition"]
TradePermissionMode = Literal["attack", "defensive", "reduce_only", "hedge_only", "reject", "manual_review"]


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


class NetRewardBreakdown(BaseModel):
    mean: float
    cvar: float
    grossPnl: float
    costPenalty: float
    riskPenalty: float
    uncertaintyPenalty: float


class TradePermission(BaseModel):
    allowed: bool
    mode: TradePermissionMode
    reasons: list[str]
    diagnostics: dict[str, float]


class QuantDiagnostics(BaseModel):
    score: float
    momentum: float
    emaSpread: float
    rsi: float
    atrPct: float
    volumeRatio: float


class AnalysisMeta(BaseModel):
    engine: str
    generatedAt: str
    candleCount: int


class AnalysisRunResponse(BaseModel):
    trend: AnalysisTrend
    regime: QuantRegime
    confidence: float = Field(..., ge=0, le=1)
    structuralError: float = Field(..., ge=0, le=1)
    spectralGap: float = Field(..., ge=0, le=1)
    bellmanResidual: float = Field(..., ge=0, le=1)
    netReward: NetRewardBreakdown
    tradePermission: TradePermission
    diagnostics: QuantDiagnostics
    signals: list[AnalysisSignal]
    levels: AnalysisLevels
    summary: str
    meta: AnalysisMeta
