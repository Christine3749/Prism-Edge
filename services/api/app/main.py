import os

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from services.api.app.routes.quant import router as quant_router
from services.api.app.schemas import AnalysisRunRequest, AnalysisRunResponse
from services.quant.prism_edge_quant.engine import run_analysis


INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")

_PUBLIC_PATHS = {"/api/health", "/docs", "/openapi.json", "/redoc"}

app = FastAPI(
    title="Prism-Edge Quant API",
    description="Backend boundary for market analysis, quant adapters, and future backtesting services.",
    version="0.1.0",
)

app.include_router(quant_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def verify_internal_key(request: Request, call_next):
    if not INTERNAL_API_KEY or request.url.path in _PUBLIC_PATHS:
        return await call_next(request)
    if request.headers.get("X-Internal-Key", "") != INTERNAL_API_KEY:
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "prism-edge-api",
        "quantAdapter": "prism-edge-technical-v1",
        "dgwmAdapter": "dgwm-prism-adapter-v0",
        "auth": "enabled" if INTERNAL_API_KEY else "disabled",
    }


@app.post("/api/analysis/run", response_model=AnalysisRunResponse)
def run_market_analysis(request: AnalysisRunRequest):
    try:
        return run_analysis(
            symbol=request.symbol,
            interval=request.interval,
            candles=[candle.model_dump() for candle in request.candles],
            indicators=request.indicators,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
