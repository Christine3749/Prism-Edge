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
- `confidence`: number from `0` to `1`
- `signals`: zero or more buy/sell/watch annotations for chart overlays
- `levels.support`: support prices, nearest first
- `levels.resistance`: resistance prices, nearest first
- `summary`: short human-readable explanation for the AI Analysis panel
- `meta.engine`: adapter/model version string

Next adapter milestones:

1. Replace the mock engine with the existing Python model behind the same function signature.
2. Add optional computed indicator arrays when the model needs them.
3. Add `/api/market/history` for normalized K line retrieval.
4. Add `/api/backtest/run` once strategy outputs are stable.
