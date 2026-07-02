import { useEffect, useRef, useState } from "react";
import { generateMarketTrades, generateOrderBook, type MarketTrade } from "../../../shared/src/mockMarketData";
import type { MarketSymbol, OrderBookItem } from "../../../shared/src/types";
import { buildTrade } from "./bottomPanelAccess";
import type { BottomPanelTab } from "./types";

export function useBottomPanelMarketFeed(currentSymbol: MarketSymbol, activeTab: BottomPanelTab) {
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookItem[]; asks: OrderBookItem[] }>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const currentSymbolRef = useRef(currentSymbol);

  useEffect(() => {
    currentSymbolRef.current = currentSymbol;
  }, [currentSymbol]);

  useEffect(() => {
    const book = generateOrderBook(currentSymbol.price, currentSymbol.precision);
    const list = generateMarketTrades(currentSymbol.price, currentSymbol.precision, 12);
    setOrderBook(book);
    setTrades(list);
    if (activeTab !== "book" && activeTab !== "trades") return;

    const tickIntervalSec = currentSymbol.type === "crypto" ? 1500 : 3000;
    const interval = window.setInterval(() => {
      const liveSymbol = currentSymbolRef.current;
      setOrderBook(() => {
        const freshPrice = liveSymbol.price + (Math.random() - 0.5) * liveSymbol.price * 0.001;
        return generateOrderBook(freshPrice, liveSymbol.precision);
      });
      setTrades((prev) => [buildTrade(liveSymbol), ...prev.slice(0, 11)]);
    }, tickIntervalSec);

    return () => window.clearInterval(interval);
  }, [currentSymbol.id, currentSymbol.precision, currentSymbol.type, activeTab]);

  return { orderBook, trades };
}