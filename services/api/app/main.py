from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.api.app.schemas import AnalysisRunRequest, AnalysisRunResponse
from services.quant.msir_prism_quant.engine import run_analysis


app = FastAPI(
    title="MSIR Prism Quant API",
    description="Backend boundary for market analysis, quant adapters, and future backtesting services.",
    version="0.1.0",
)

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


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "msir-prism-api",
        "quantAdapter": "msir-mock-quant-v0",
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
