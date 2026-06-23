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
  "confidence": 0.78,
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
    "engine": "prism-edge-mock-quant-v0",
    "generatedAt": "2026-06-23T00:00:00+00:00",
    "candleCount": 200
  }
}
```

Development ports:

- Web gateway: `http://localhost:3000`
- FastAPI backend: `http://localhost:8000`
- OpenAPI docs: `http://localhost:8000/docs`

The web gateway forwards `/api/analysis/run` to FastAPI through `API_BASE_URL`. If FastAPI is not running, the gateway returns a same-shape local fallback so the UI can continue to work during frontend development.
