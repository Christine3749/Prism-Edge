import type { CSSProperties } from "react";
import type { MarketSymbol, OrderBookItem } from "../../../shared/src/types";

interface OrderBookTabProps {
  orderBook: { bids: OrderBookItem[]; asks: OrderBookItem[] };
  currentSymbol: MarketSymbol;
}

const bookGridTemplate: CSSProperties = {
  gridTemplateColumns: "minmax(7.5rem, 1fr) minmax(5rem, 0.7fr) minmax(5.5rem, 0.7fr)",
  columnGap: "0.75rem"
};

export function OrderBookTab({ orderBook, currentSymbol }: OrderBookTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-5 h-full text-[10px] font-mono select-none">
      <BookSide
        rows={orderBook.asks.slice().reverse()}
        totalBase={orderBook.asks[orderBook.asks.length - 1]?.total || 1}
        side="ask"
        precision={currentSymbol.precision}
      />
      <BookSide
        rows={orderBook.bids}
        totalBase={orderBook.bids[orderBook.bids.length - 1]?.total || 1}
        side="bid"
        precision={currentSymbol.precision}
      />
    </div>
  );
}

function BookSide({
  rows,
  totalBase,
  side,
  precision
}: {
  rows: OrderBookItem[];
  totalBase: number;
  side: "ask" | "bid";
  precision: number;
}) {
  const isAsk = side === "ask";
  const textClass = isAsk ? "text-rose-400" : "text-emerald-300";
  const hoverClass = isAsk ? "hover:bg-rose-950/10" : "hover:bg-emerald-950";
  const depthClass = isAsk ? "bg-rose-500/5" : "bg-emerald-500/20";
  return (
    <div className="flex flex-col">
      <div className="grid text-slate-500 border-b border-slate-900 pb-1 font-bold text-[9px] uppercase" style={bookGridTemplate}>
        <span className={`text-left ${textClass}`}>{isAsk ? "Ask" : "Bid"} price</span>
        <span className="text-right">Quantity</span>
        <span className="text-right hidden sm:inline">Total sum</span>
      </div>
      <div className="flex-grow overflow-y-auto space-y-0.5 pt-0.5 max-h-40 sm:max-h-none">
        {rows.map((row, i) => {
          const percent = Math.min((row.total / totalBase) * 100, 100);
          return (
            <div key={i} className={`grid relative ${hoverClass} py-0.5 pr-1`} style={bookGridTemplate}>
              <div className={`absolute right-0 top-0 bottom-0 ${depthClass} -z-10 transition-all pointer-events-none`} style={{ width: `${percent}%` }}></div>
              <span className={`text-left ${textClass} font-extrabold pl-1`}>
                {row.price.toLocaleString(undefined, { minimumFractionDigits: precision })}
              </span>
              <span className="text-right text-slate-300">{row.amount}</span>
              <span className="text-right text-slate-500 hidden sm:inline">{row.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
