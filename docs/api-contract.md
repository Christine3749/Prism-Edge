# Prism-Edge API Contract

## Health

```http
GET /api/health
```

Returns service readiness for the web gateway or FastAPI backend.

## Run Analysis

```http
POST /api/analysis/run
Content-Type: application/json
```

Request:

```json
{
  "symbol": "BTC/USDT",
  "interval": "1h",
  "candles": [
    {
      "time": 1719200000,
      "open": 65000,
      "high": 65500,
      "low": 64800,
      "close": 65200,
      "volume": 1234
    }
  ],
  "indicators": ["SMA", "EMA", "RSI", "MACD"]
}
```

Response:

```json
{
  "trend": "bullish",
  "regime": "trend",
  "confidence": 0.78,
  "structuralError": 0.21,
  "spectralGap": 0.56,
  "bellmanResidual": 0.18,
  "netReward": {
    "mean": 0.0124,
    "cvar": -0.0062,
    "grossPnl": 0.021,
    "costPenalty": 0.003,
    "riskPenalty": 0.004,
    "uncertaintyPenalty": 0.0016
  },
  "tradePermission": {
    "allowed": true,
    "mode": "defensive",
    "reasons": [],
    "diagnostics": {
      "structuralError": 0.21,
      "spectralGap": 0.56,
      "bellmanResidual": 0.18,
      "netRewardMean": 0.0124
    }
  },
  "diagnostics": {
    "score": 0.32,
    "momentum": 0.018,
    "emaSpread": 0.006,
    "rsi": 61.2,
    "atrPct": 0.024,
    "volumeRatio": 1.22
  },
  "signals": [
    {
      "type": "buy",
      "time": 1719200000,
      "price": 65200,
      "label": "Momentum Breakout",
      "confidence": 0.78
    }
  ],
  "levels": {
    "support": [64000, 62800],
    "resistance": [66000, 67500]
  },
  "summary": "当前结构偏多，但接近压力区，注意回撤确认。",
  "meta": {
    "engine": "prism-edge-technical-v1",
    "generatedAt": "2026-06-23T00:00:00+00:00",
    "candleCount": 200
  }
}
```

`structuralError`, `spectralGap`, `bellmanResidual`, `netReward`, and `tradePermission` are Prism's quant-v2 adapter fields. They are currently produced by `prism-edge-technical-v1` / `node-technical-fallback-v1` and are intended to be replaced by the DGWM adapter without changing the frontend contract.

Development ports:

- Web gateway: `http://localhost:3000`
- FastAPI backend: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

The web gateway forwards `/api/analysis/run` to FastAPI through `API_BASE_URL`. If FastAPI is not running, the gateway returns a same-shape local fallback so the UI can continue to work during frontend development.

## Quant Adapter Health

```http
GET /api/quant/health
```

Returns DGWM adapter version, configured root path, import probe, and key DGWM quant file availability.

## Quant State Compile

```http
POST /api/quant/state/compile
```

Compiles candles into the first MSIR Prism state object for the DGWM boundary.

## Quant Decision

```http
POST /api/quant/decision/run
```

Returns the same quant-v2 analysis result as `/api/analysis/run`, plus adapter metadata and the compiled state. Current runtime is `technical-decision-bridge`; the contract is shaped for the real DGWM runtime readout.

## Backtest

```http
POST /api/backtest/run
```

Runs a lightweight walk-forward validation over the submitted candles. Signals are computed from candles up to bar `t`, then PnL is booked from realized forward price movement over `horizon` bars, after `costBps`; the report includes buy-and-hold and excess-return comparison fields.

## Market Search

```http
GET /api/market/search?q=0700.HK&market=all&limit=30
```

Returns searchable market instruments from the Prism catalog plus delayed public market search when available.

Supported symbol patterns:

- Crypto: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`
- US stocks / ETFs / indexes: `AAPL`, `TSLA`, `SPY`, `^GSPC`
- A-share Shanghai: `600519.SS`, `000001.SS`
- A-share Shenzhen: `000001.SZ`, `300750.SZ`, `399001.SZ`
- Hong Kong: `0700.HK`, `9988.HK`, `^HSI`
- Forex: `EURUSD`, `EURUSD=X`

Response:

```json
{
  "results": [
    {
      "id": "0700.HK",
      "symbol": "0700.HK",
      "name": "Tencent Holdings",
      "type": "stock",
      "market": "hk",
      "exchange": "HKEX",
      "currency": "HKD",
      "dataProvider": "yahoo",
      "price": 382.4,
      "change24h": 0.86,
      "volume24h": 21800000,
      "precision": 2
    }
  ],
  "count": 1,
  "source": "catalog+yahoo"
}
```

## Market Candles

```http
GET /api/market/klines?symbol=000001.SZ&interval=1D&limit=200
```

The gateway routes market data by symbol:

- `binance` or `coinbase` for live crypto candles when available.
- `yahoo-delayed` for public delayed stock, index, Hong Kong, A-share, and forex candles.
- The frontend falls back to explicit `simulated` data if every public provider is unreachable.
- Candle responses include `updatedAt` and `isLive` so the UI can show live, delayed, stale, or simulated feed state.

## Market Quotes

```http
GET /api/market/quote?symbols=BTCUSDT,AAPL,0700.HK,000001.SZ
```

Returns latest price, percent change, volume, source, update timestamp, and `isLive`.

`isLive: true` means live crypto gateway data. Public equity, index, A-share, Hong Kong, and forex feeds are marked `isLive: false` with `source: "yahoo-delayed"` until a licensed realtime market vendor is connected.

