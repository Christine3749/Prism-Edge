# Prism-Edge Model Contract

The frontend never calls a quant model directly. It sends candles to the backend API, and the backend calls a model adapter in `services/quant`.

Current adapter:

```python
run_analysis(
    symbol: str,
    interval: str,
    candles: list[dict],
    indicators: list[str] | None = None,
) -> dict
```

Input assumptions:

- `candles` are ordered oldest to newest.
- `time` is Unix seconds.
- OHLCV values are numeric.
- `indicators` names are feature flags from the UI, not precomputed indicator series yet.

Output requirements:

- `trend`: one of `bullish`, `bearish`, `neutral`
- `regime`: one of `trend`, `range`, `breakout`, `stress`, `transition`
- `confidence`: number from `0` to `1`
- `structuralError`: quant structure uncertainty from `0` to `1`
- `spectralGap`: structure separation / stability proxy from `0` to `1`
- `bellmanResidual`: planning residual proxy from `0` to `1`
- `netReward`: model utility proxy after cost, risk, and uncertainty penalties; this is not realized market PnL
- `tradePermission`: allowed/mode/reasons/diagnostics for attack, defensive, manual review, or reject
- `diagnostics`: numeric score, momentum, EMA spread, RSI, ATR percent, and volume ratio
- `signals`: zero or more buy/sell/watch annotations for chart overlays
- `levels.support`: support prices, nearest first
- `levels.resistance`: resistance prices, nearest first
- `summary`: short human-readable explanation for the AI Analysis panel
- `meta.engine`: adapter/model version string

Current adapter features:

1. Computes momentum, EMA spread, RSI, MACD histogram, ATR volatility, Bollinger width, and relative volume.
2. Produces nearest support/resistance from recent swing highs/lows.
3. Estimates quant-v2 structure fields so the UI can already display DGWM-shaped output.
4. Emits one actionable `buy`, `sell`, or `watch` signal for chart overlays.

Next adapter milestones:

1. Add `services/quant/dgwm_adapter.py` as the real DGWM bridge.
2. Add `/api/quant/state/compile` for point-in-time observation/state construction.
3. Add `/api/backtest/run` and shadow trading reports once strategy outputs are stable.
4. Replace or ensemble this adapter with the user's production DGWM strategy model.

