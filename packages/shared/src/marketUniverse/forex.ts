import type { MarketSymbol } from "../types";

export const FOREX_MARKET_SYMBOLS: MarketSymbol[] = [
  { id: "AUD/USD", symbol: "AUDUSD", name: "Australian Dollar / US Dollar", type: "forex", market: "forex", exchange: "FX", currency: "USD", dataProvider: "yahoo", yahooSymbol: "AUDUSD=X", price: 0.66, change24h: 0.04, volume24h: 150000000, precision: 5 },
  { id: "USD/CNH", symbol: "USDCNH", name: "US Dollar / Offshore Yuan", type: "forex", market: "forex", exchange: "FX", currency: "CNH", dataProvider: "yahoo", yahooSymbol: "USDCNH=X", price: 7.26, change24h: 0.02, volume24h: 220000000, precision: 5 },
  { id: "XAU/USD", symbol: "XAUUSD", name: "Gold Spot / US Dollar", type: "forex", market: "forex", exchange: "FX", currency: "USD", dataProvider: "yahoo", yahooSymbol: "GC=F", price: 2360, change24h: 0.24, volume24h: 0, precision: 2 },
  { id: "USD/CHF", symbol: "USDCHF", name: "US Dollar / Swiss Franc", type: "forex", market: "forex", exchange: "FX", currency: "CHF", dataProvider: "yahoo", yahooSymbol: "USDCHF=X", price: 0.89, change24h: 0.03, volume24h: 125000000, precision: 5 },
  { id: "USD/CAD", symbol: "USDCAD", name: "US Dollar / Canadian Dollar", type: "forex", market: "forex", exchange: "FX", currency: "CAD", dataProvider: "yahoo", yahooSymbol: "USDCAD=X", price: 1.37, change24h: -0.04, volume24h: 132000000, precision: 5 },
  { id: "NZD/USD", symbol: "NZDUSD", name: "New Zealand Dollar / US Dollar", type: "forex", market: "forex", exchange: "FX", currency: "USD", dataProvider: "yahoo", yahooSymbol: "NZDUSD=X", price: 0.61, change24h: 0.05, volume24h: 76000000, precision: 5 },
  { id: "EUR/JPY", symbol: "EURJPY", name: "Euro / Japanese Yen", type: "forex", market: "forex", exchange: "FX", currency: "JPY", dataProvider: "yahoo", yahooSymbol: "EURJPY=X", price: 170.5, change24h: 0.08, volume24h: 115000000, precision: 3 },
  { id: "EUR/GBP", symbol: "EURGBP", name: "Euro / Pound Sterling", type: "forex", market: "forex", exchange: "FX", currency: "GBP", dataProvider: "yahoo", yahooSymbol: "EURGBP=X", price: 0.84, change24h: -0.02, volume24h: 94000000, precision: 5 },
  { id: "GBP/JPY", symbol: "GBPJPY", name: "Pound Sterling / Japanese Yen", type: "forex", market: "forex", exchange: "FX", currency: "JPY", dataProvider: "yahoo", yahooSymbol: "GBPJPY=X", price: 201.2, change24h: 0.12, volume24h: 111000000, precision: 3 },
  { id: "AUD/JPY", symbol: "AUDJPY", name: "Australian Dollar / Japanese Yen", type: "forex", market: "forex", exchange: "FX", currency: "JPY", dataProvider: "yahoo", yahooSymbol: "AUDJPY=X", price: 104.6, change24h: 0.06, volume24h: 84000000, precision: 3 }
];
