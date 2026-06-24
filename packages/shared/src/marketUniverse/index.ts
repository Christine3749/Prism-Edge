import type { MarketSymbol } from "../types";
import { CN_MARKET_SYMBOLS } from "./cn";
import { CRYPTO_MARKET_SYMBOLS } from "./crypto";
import { FOREX_MARKET_SYMBOLS } from "./forex";
import { HK_MARKET_SYMBOLS } from "./hk";
import { US_MARKET_SYMBOLS } from "./us";

export { MAINSTREAM_MARKET_ORDER } from "./order";

export const MARKET_UNIVERSE_SYMBOLS: MarketSymbol[] = [
  ...CRYPTO_MARKET_SYMBOLS,
  ...US_MARKET_SYMBOLS,
  ...CN_MARKET_SYMBOLS,
  ...HK_MARKET_SYMBOLS,
  ...FOREX_MARKET_SYMBOLS
];
