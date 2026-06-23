import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();
dotenv.config({ path: ".env.local" });

const app = express();
app.use(express.json({ limit: "8mb" }));

const PORT = Number(process.env.PORT || 3000);
const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";
const API_CACHE_CONTROL = "no-store, max-age=0";
const HTML_CACHE_CONTROL = "no-cache, max-age=0, must-revalidate";
const STATIC_ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

type Trend = "bullish" | "bearish" | "neutral";
type SignalType = "buy" | "sell" | "watch";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AnalysisBody {
  symbol?: string;
  interval?: string;
  timeframe?: string;
  candles?: Candle[];
  indicators?: unknown;
}

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string
];

type CoinbaseCandle = [number, number, number, number, number, number];

const BINANCE_ENDPOINTS = [
  "https://api.binance.com",
  "https://data-api.binance.vision"
];

const marketCache = new Map<string, { expiresAt: number; payload: unknown }>();

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", API_CACHE_CONTROL);
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundPrice(value: number, candles: Candle[]) {
  const sample = candles.find((candle) => Number.isFinite(candle.close));
  const decimalHint = sample ? String(sample.close).split(".")[1]?.length || 2 : 2;
  const decimals = clamp(decimalHint, 2, 8);
  return Number(value.toFixed(decimals));
}

function toBinanceInterval(timeframe: string | undefined) {
  const tf = (timeframe || "1D").trim();
  if (tf.endsWith("M")) return "1M";

  const normalized = tf.toLowerCase();
  const supported = new Set(["1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w"]);
  return supported.has(normalized) ? normalized : "1d";
}

function toCoinbaseGranularity(interval: string) {
  switch (interval) {
    case "1m": return 60;
    case "5m": return 300;
    case "15m": return 900;
    case "1h": return 3600;
    case "4h": return 21600;
    case "1d": return 86400;
    case "1w": return 86400;
    case "1M": return 86400;
    default: return 86400;
  }
}

function toCoinbaseProductId(symbol: string) {
  const quotes = ["USDT", "USDC", "USD", "EUR", "BTC", "ETH"];
  const quote = quotes.find((candidate) => symbol.endsWith(candidate));
  if (!quote) return symbol;
  const base = symbol.slice(0, -quote.length);
  return `${base}-${quote}`;
}

function parseLimit(rawLimit: unknown) {
  const parsed = Number(rawLimit || 200);
  if (!Number.isFinite(parsed)) return 200;
  return clamp(Math.floor(parsed), 1, 500);
}

function parseBinanceKlines(data: unknown): Candle[] {
  if (!Array.isArray(data)) {
    throw new Error("Binance kline response was not an array.");
  }

  return (data as BinanceKline[]).map((item) => ({
    time: Math.round(Number(item[0]) / 1000),
    open: Number(item[1]),
    high: Number(item[2]),
    low: Number(item[3]),
    close: Number(item[4]),
    volume: Number(item[5])
  })).filter((candle) => (
    Number.isFinite(candle.time) &&
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close)
  ));
}

async function fetchBinanceKlines(symbol: string, interval: string, limit: number) {
  const errors: string[] = [];

  for (const baseUrl of BINANCE_ENDPOINTS) {
    const url = `${baseUrl}/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4500) });
      const text = await response.text();

      if (!response.ok) {
        errors.push(`${baseUrl}: ${response.status} ${text.slice(0, 140)}`);
        continue;
      }

      return parseBinanceKlines(JSON.parse(text));
    } catch (error: any) {
      errors.push(`${baseUrl}: ${error?.message || String(error)}`);
    }
  }

  throw new Error(errors.join(" | ") || "All Binance endpoints failed.");
}

async function fetchCoinbaseKlines(symbol: string, interval: string, limit: number) {
  const productId = toCoinbaseProductId(symbol);
  const granularity = toCoinbaseGranularity(interval);
  const url = `https://api.exchange.coinbase.com/products/${encodeURIComponent(productId)}/candles?granularity=${granularity}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Prism-Edge market data gateway" },
    signal: AbortSignal.timeout(4500)
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Coinbase ${productId}: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = JSON.parse(text);
  if (!Array.isArray(data)) {
    throw new Error(`Coinbase ${productId}: candle response was not an array.`);
  }

  return (data as CoinbaseCandle[])
    .map((item) => ({
      time: Number(item[0]),
      open: Number(item[3]),
      high: Number(item[2]),
      low: Number(item[1]),
      close: Number(item[4]),
      volume: Number(item[5])
    }))
    .filter((candle) => (
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close)
    ))
    .sort((a, b) => a.time - b.time)
    .slice(-limit);
}

async function fetchMarketKlines(symbol: string, interval: string, limit: number) {
  const errors: string[] = [];

  try {
    const candles = await fetchBinanceKlines(symbol, interval, limit);
    return { candles, source: "binance" };
  } catch (error: any) {
    errors.push(`binance: ${error?.message || String(error)}`);
  }

  try {
    const candles = await fetchCoinbaseKlines(symbol, interval, limit);
    return { candles, source: "coinbase" };
  } catch (error: any) {
    errors.push(`coinbase: ${error?.message || String(error)}`);
  }

  throw new Error(errors.join(" | "));
}

function computeLocalAnalysis(body: AnalysisBody) {
  const symbol = body.symbol || "UNKNOWN";
  const interval = body.interval || body.timeframe || "1D";
  const candles = Array.isArray(body.candles) ? body.candles.filter((candle) => Number.isFinite(candle.close)) : [];

  if (candles.length === 0) {
    throw new Error("Missing candles dataset.");
  }

  const recent = candles.slice(-40);
  const last = recent[recent.length - 1];
  const first = recent[0];
  const closes = recent.map((candle) => candle.close);
  const highs = recent.map((candle) => candle.high);
  const lows = recent.map((candle) => candle.low);

  const smaFast = average(closes.slice(-8));
  const smaSlow = average(closes.slice(-24));
  const momentum = first.close !== 0 ? (last.close - first.close) / first.close : 0;
  const maSpread = smaSlow !== 0 ? (smaFast - smaSlow) / smaSlow : 0;

  let trend: Trend = "neutral";
  if (momentum > 0.002 && maSpread >= -0.001) trend = "bullish";
  if (momentum < -0.002 && maSpread <= 0.001) trend = "bearish";

  const confidence = clamp(0.55 + Math.abs(momentum) * 8 + Math.abs(maSpread) * 6, 0.55, 0.92);
  const signalType: SignalType = trend === "bullish" ? "buy" : trend === "bearish" ? "sell" : "watch";
  const signalLabel = trend === "bullish"
    ? "Momentum Breakout"
    : trend === "bearish"
      ? "Risk-Off Reversal"
      : "Range Compression Watch";

  const supportPrimary = Math.min(...lows.slice(-20));
  const supportSecondary = Math.min(...lows);
  const resistancePrimary = Math.max(...highs.slice(-20));
  const resistanceSecondary = Math.max(...highs);
  const support = Array.from(new Set([supportPrimary, supportSecondary].map((value) => roundPrice(value, recent))));
  const resistance = Array.from(new Set([resistancePrimary, resistanceSecondary].map((value) => roundPrice(value, recent))));

  const trendText = trend === "bullish" ? "偏多" : trend === "bearish" ? "偏空" : "中性震荡";
  const summary = `${symbol} ${interval} 当前结构${trendText}，最近窗口动量为 ${(momentum * 100).toFixed(2)}%，快慢均线差为 ${(maSpread * 100).toFixed(2)}%。短线先观察 ${resistance[0]} 压力与 ${support[0]} 支撑的有效性，等待突破或回踩确认后再提高策略权重。`;

  return {
    trend,
    confidence: Number(confidence.toFixed(2)),
    signals: [
      {
        type: signalType,
        time: last.time,
        price: roundPrice(last.close, recent),
        label: signalLabel,
        confidence: Number(confidence.toFixed(2))
      }
    ],
    levels: {
      support,
      resistance
    },
    summary,
    meta: {
      engine: "node-offline-fallback",
      generatedAt: new Date().toISOString(),
      candleCount: candles.length
    },
    serviceFallback: true
  };
}

app.get("/api/health", async (_req, res) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(1500) });
    const payload = await response.json();
    return res.status(response.status).json(payload);
  } catch {
    return res.json({
      status: "degraded",
      web: "ok",
      apiBaseUrl: API_BASE_URL,
      message: "FastAPI service is not reachable; Node fallback is active."
    });
  }
});

app.get("/api/market/klines", async (req, res) => {
  const symbol = String(req.query.symbol || "").trim().toUpperCase();
  const interval = toBinanceInterval(String(req.query.interval || req.query.timeframe || "1D"));
  const limit = parseLimit(req.query.limit);

  if (!/^[A-Z0-9]{5,24}$/.test(symbol)) {
    return res.status(400).json({ error: "Invalid market symbol." });
  }

  const cacheKey = `${symbol}:${interval}:${limit}`;
  const cached = marketCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.payload);
  }

  try {
    const { candles, source } = await fetchMarketKlines(symbol, interval, limit);
    if (candles.length === 0) {
      return res.status(502).json({ error: "No candle data returned by market source." });
    }

    const payload = {
      symbol,
      interval,
      source,
      candles
    };

    marketCache.set(cacheKey, {
      expiresAt: Date.now() + (limit <= 2 ? 2000 : 15000),
      payload
    });

    return res.json(payload);
  } catch (error: any) {
    console.warn(`Market data gateway failed for ${symbol} ${interval}.`, error);
    return res.status(502).json({
      error: "Market data gateway unavailable.",
      detail: error?.message || String(error)
    });
  }
});

app.post("/api/analysis/run", async (req, res) => {
  const upstreamUrl = `${API_BASE_URL}/api/analysis/run`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();
    return res.status(response.status).type(contentType).send(text);
  } catch (error) {
    console.warn(`FastAPI analysis endpoint unavailable at ${upstreamUrl}. Serving local fallback.`, error);
    try {
      return res.json(computeLocalAnalysis(req.body));
    } catch (fallbackError: any) {
      return res.status(400).json({ error: fallbackError.message || "Invalid analysis request." });
    }
  }
});

app.get("/api/news", (req, res) => {
  const { symbol } = req.query;
  const asset = (symbol as string) || "Crypto/Global";

  const newsItems = [
    {
      id: "1",
      title: `${asset} Displays Substantial Order Block Consolidation Near Key Support`,
      source: "Prism Market Pulse",
      time: "12m ago",
      sentiment: "neutral",
      summary: "Consensus remains split as whale wallets absorb spot order distribution, building high-density clusters.",
      url: "#"
    },
    {
      id: "2",
      title: "Liquidity Volatilities Surge in Options Spreads Across Prime Market Pairs",
      source: "Chronicle Institutional",
      time: "48m ago",
      sentiment: "bullish",
      summary: "Implied volatility premiums compress as market participants buy leverage-backed calls for upside breakout configurations.",
      url: "#"
    },
    {
      id: "3",
      title: "Regulatory Framework Revisions Prompt Capital Allocations Shifting",
      source: "Apex Capital Research",
      time: "2h ago",
      sentiment: "bullish",
      summary: "New policy proposals support compliance-ready custody products, triggering institutional fiat inflows.",
      url: "#"
    },
    {
      id: "4",
      title: "Global Macro Indicators Hint at Shift in Yield Curve Pressures",
      source: "Prism Global",
      time: "4h ago",
      sentiment: "neutral",
      summary: "Central banks monitor core retail sales indexes for adjustments to upcoming borrowing guidelines.",
      url: "#"
    },
    {
      id: "5",
      title: "Automated Liquidation Sweeps Trigger Squeeze Across Leveraged Shorts",
      source: "Derivatives Daily",
      time: "6h ago",
      sentiment: "bullish",
      summary: "Unwinding futures margins spike buying pressures on short stops, cleaning the immediate supply grid.",
      url: "#"
    }
  ];

  res.json({ news: newsItems });
});

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Prism-Edge web server in development mode with Vite middleware...");
    const vite = await createViteServer({
      configFile: path.join(process.cwd(), "vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production bundle from dist folder...");
    const distPath = path.join(process.cwd(), "dist");

    app.use("/assets", express.static(path.join(distPath, "assets"), {
      immutable: true,
      maxAge: "1y",
      setHeaders: (res) => {
        res.setHeader("Cache-Control", STATIC_ASSET_CACHE_CONTROL);
      }
    }));

    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
      }
    }));

    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", HTML_CACHE_CONTROL);
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Prism-Edge web application running at http://localhost:${PORT}`);
    console.log(`Analysis API gateway target: ${API_BASE_URL}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failure bootstrapping Prism-Edge web server:", err);
});
