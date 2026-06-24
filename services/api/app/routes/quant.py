from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.api.app.schemas import Candle
from services.quant.dgwm_adapter import DgwmAdapter


router = APIRouter()
adapter = DgwmAdapter()


class QuantPayload(BaseModel):
    symbol: str = Field(..., examples=["BTC/USDT"])
    interval: str = Field(default="1D", examples=["1h"])
    candles: list[Candle] = Field(default_factory=list)
    indicators: list[str] = Field(default_factory=list)
    source: str = "msir-prism"
    provider: str = "frontend"
    context: dict[str, Any] = Field(default_factory=dict)


class BacktestPayload(QuantPayload):
    window: int = Field(default=80, ge=30, le=260)


@router.get("/api/quant/health")
def quant_health():
    return adapter.health()


@router.post("/api/quant/state/compile")
def compile_quant_state(request: QuantPayload):
    try:
        return adapter.compile_state(_payload(request))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/quant/decision/run")
def run_quant_decision(request: QuantPayload):
    try:
        return adapter.run_decision(_payload(request))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/api/backtest/run")
def run_backtest(request: BacktestPayload):
    try:
        return adapter.run_backtest(_payload(request) | {"window": request.window})
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _payload(request: QuantPayload) -> dict[str, Any]:
    return {
        "symbol": request.symbol,
        "interval": request.interval,
        "candles": [candle.model_dump() for candle in request.candles],
        "indicators": list(request.indicators),
        "source": request.source,
        "provider": request.provider,
        "context": dict(request.context),
    }
