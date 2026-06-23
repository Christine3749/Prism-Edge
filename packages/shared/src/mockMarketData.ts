import { MarketSymbol, Candle } from "./types";

// 1. Core Symbol Catalog branded for MSIR Prism | 棱镜先生
export const DEFAULT_SYMBOLS: MarketSymbol[] = [
  // Crypto
  { id: "BTC/USDT", symbol: "BTCUSDT", name: "Bitcoin / Tether", type: "crypto", price: 65420.50, change24h: 2.45, volume24h: 1845020000, precision: 2 },
  { id: "ETH/USDT", symbol: "ETHUSDT", name: "Ethereum / Tether", type: "crypto", price: 3450.75, change24h: -1.15, volume24h: 924850000, precision: 2 },
  { id: "SOL/USDT", symbol: "SOLUSDT", name: "Solana / Tether", type: "crypto", price: 142.10, change24h: 5.62, volume24h: 420910000, precision: 2 },
  { id: "PRISM/USDT", symbol: "PRISMUSDT", name: "MSIR Prism Token", type: "crypto", price: 12.85, change24h: 12.4, volume24h: 89000000, precision: 4 },
  // Stock
  { id: "TSLA", symbol: "TSLA", name: "Tesla Motors Inc.", type: "stock", price: 178.45, change24h: 1.84, volume24h: 89450000, precision: 2 },
  { id: "AAPL", symbol: "AAPL", name: "Apple Inc.", type: "stock", price: 214.30, change24h: -0.42, volume24h: 52100000, precision: 2 },
  { id: "NVDA", symbol: "NVDA", name: "NVIDIA Corporation", type: "stock", price: 124.80, change24h: 7.15, volume24h: 145200000, precision: 2 },
  { id: "MSFT", symbol: "MSFT", name: "Microsoft Corp.", type: "stock", price: 428.15, change24h: -0.22, volume24h: 22100000, precision: 2 },
  // Forex
  { id: "EUR/USD", symbol: "EURUSD", name: "Euro / US Dollar", type: "forex", price: 1.0845, change24h: 0.12, volume24h: 310000000, precision: 5 },
  { id: "USD/JPY", symbol: "USDJPY", name: "US Dollar / Japanese Yen", type: "forex", price: 158.35, change24h: 0.42, volume24h: 410000000, precision: 3 },
  { id: "GBP/USD", symbol: "GBPUSD", name: "Pound Sterling / US Dollar", type: "forex", price: 1.2825, change24h: -0.05, volume24h: 180000000, precision: 5 }
];

// Helper to convert timeframes into seconds
export function timeframeToSeconds(tf: string): number {
  const num = parseInt(tf.slice(0, -1)) || 1;
  const unit = tf.slice(-1);
  switch (unit) {
    case "m": return num * 60;
    case "h": return num * 3600;
    case "D": return num * 86400;
    case "W": return num * 86400 * 7;
    case "M": return num * 86400 * 30;
    default: return 86400;
  }
}

// Generate Sophisticated Mock Historical Data
export function generateSimulatedHistoricalKlines(
  symbol: MarketSymbol,
  timeframe: string,
  count = 200
): Candle[] {
  const candles: Candle[] = [];
  const secStep = timeframeToSeconds(timeframe);
  const now = Math.floor(Date.now() / 1000);
  
  let currentPrice = symbol.price;
  const isForex = symbol.type === "forex";
  const volatility = isForex ? 0.0008 : 0.006;
  
  for (let i = count - 1; i >= 0; i--) {
    const time = now - (i * secStep);
    const cycle = Math.sin(i / 15) * (currentPrice * volatility * 1.5);
    const noise = (Math.random() - 0.49) * (currentPrice * volatility);
    const priceChange = cycle + noise;
    
    const open = currentPrice - priceChange;
    const close = currentPrice;
    
    const high = Math.max(open, close) + (Math.random() * currentPrice * volatility * 0.5);
    const low = Math.min(open, close) - (Math.random() * currentPrice * volatility * 0.5);
    
    const volumeMultiplier = (Math.random() * 0.8 + 0.6) * (Math.abs(priceChange) / (currentPrice * volatility) + 0.2);
    const volume = Math.round((symbol.volume24h / (24 * 60)) * volumeMultiplier);

    candles.push({
      time,
      open: Number(open.toFixed(symbol.precision)),
      high: Number(high.toFixed(symbol.precision)),
      low: Number(low.toFixed(symbol.precision)),
      close: Number(close.toFixed(symbol.precision)),
      volume: isForex ? 0 : Number(volume.toFixed(0)),
    });

    currentPrice = open;
  }

  return candles;
}

// Generate Live Ticking Updates for Active Simulators
export function simulateNextTick(
  lastCandle: Candle,
  symbol: MarketSymbol,
  timeframe: string
): { updatedCandle: Candle; isNewBar: boolean; currentTickPrice: number } {
  const now = Math.floor(Date.now() / 1000);
  const secStep = timeframeToSeconds(timeframe);
  const currentIntervalAnchor = Math.floor(now / secStep) * secStep;

  const isForex = symbol.type === "forex";
  const volUnit = isForex ? 0.0002 : 0.0015;
  const changePercent = (Math.random() - 0.5) * volUnit;
  const priceMove = lastCandle.close * changePercent;

  const tickPrice = Number((lastCandle.close + priceMove).toFixed(symbol.precision));
  
  if (currentIntervalAnchor > lastCandle.time) {
    const newBar: Candle = {
      time: currentIntervalAnchor,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, tickPrice),
      low: Math.min(lastCandle.close, tickPrice),
      close: tickPrice,
      volume: isForex ? 0 : Math.round(Math.random() * 25000 + 5000),
    };
    return { updatedCandle: newBar, isNewBar: true, currentTickPrice: tickPrice };
  } else {
    const updated: Candle = {
      ...lastCandle,
      high: Number(Math.max(lastCandle.high, tickPrice).toFixed(symbol.precision)),
      low: Number(Math.min(lastCandle.low, tickPrice).toFixed(symbol.precision)),
      close: tickPrice,
      volume: isForex ? 0 : lastCandle.volume + Math.round(Math.random() * 500),
    };
    return { updatedCandle: updated, isNewBar: false, currentTickPrice: tickPrice };
  }
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
}

export interface MarketTrade {
  time: string;
  price: number;
  amount: number;
  side: "buy" | "sell";
}

// 5. Generate Dynamic Real-Time Order Book
export function generateOrderBook(midPrice: number, precision: number): { bids: OrderBookItem[]; asks: OrderBookItem[] } {
  const bids: OrderBookItem[] = [];
  const asks: OrderBookItem[] = [];
  const depth = 12;
  const stepPercent = precision > 4 ? 0.0001 : 0.0008;

  let cumulativeBidTotal = 0;
  let cumulativeAskTotal = 0;

  for (let i = 1; i <= depth; i++) {
    const bidPrice = Number((midPrice * (1 - i * stepPercent)).toFixed(precision));
    const bidAmount = Math.random() * (midPrice > 1000 ? 1.5 : 80) + (midPrice > 1000 ? 0.05 : 5);
    cumulativeBidTotal += bidAmount;

    bids.push({
      price: bidPrice,
      amount: Number(bidAmount.toFixed(midPrice > 1000 ? 4 : 2)),
      total: Number(cumulativeBidTotal.toFixed(midPrice > 1000 ? 4 : 2)),
    });

    const askPrice = Number((midPrice * (1 + i * stepPercent)).toFixed(precision));
    const askAmount = Math.random() * (midPrice > 1000 ? 1.5 : 80) + (midPrice > 1000 ? 0.05 : 5);
    cumulativeAskTotal += askAmount;

    asks.push({
      price: askPrice,
      amount: Number(askAmount.toFixed(midPrice > 1000 ? 4 : 2)),
      total: Number(cumulativeAskTotal.toFixed(midPrice > 1000 ? 4 : 2)),
    });
  }

  return { bids, asks };
}

// 6. Generate Realistic Market Trades List
export function generateMarketTrades(midPrice: number, precision: number, count = 15): MarketTrade[] {
  const trades: MarketTrade[] = [];
  
  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.45;
    const offset = (Math.random() - 0.5) * midPrice * (precision > 4 ? 0.0002 : 0.001);
    const tradePrice = Number((midPrice + offset).toFixed(precision));
    const amount = Math.random() * (midPrice > 1000 ? 0.8 : 50) + (midPrice > 1000 ? 0.01 : 1);
    
    const d = new Date();
    d.setSeconds(d.getSeconds() - i * Math.round(Math.random() * 3 + 1));
    const timeStr = d.toTimeString().split(" ")[0];

    trades.push({
      time: timeStr,
      price: tradePrice,
      amount: Number(amount.toFixed(midPrice > 1000 ? 4 : 2)),
      side: isBuy ? "buy" : "sell",
    });
  }
  return trades;
}
