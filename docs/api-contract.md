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

## Market Quotes

```http
GET /api/market/quote?symbols=BTCUSDT,AAPL,0700.HK,000001.SZ
```

Returns latest price, percent change, volume, source, update timestamp, and `isLive`.

`isLive: true` means live crypto gateway data. Public equity, index, A-share, Hong Kong, and forex feeds are marked `isLive: false` with `source: "yahoo-delayed"` until a licensed realtime market vendor is connected.
