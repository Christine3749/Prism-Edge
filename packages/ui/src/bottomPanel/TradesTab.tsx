import type { MarketSymbol } from "../../../shared/src/types";
import type { MarketTrade } from "../../../shared/src/mockMarketData";

interface TradesTabProps {
  trades: MarketTrade[];
  currentSymbol: MarketSymbol;
}

export function TradesTab({ trades, currentSymbol }: TradesTabProps) {
  return (
    <div className="h-full overflow-y-auto text-[11px] font-mono max-h-44 sm:max-h-none">
      <table className="w-full text-left">
        <thead>
          <tr className="text-slate-500 text-[9px] font-bold uppercase border-b border-slate-900 pb-1">
            <th className="py-1">Timestamp</th>
            <th className="py-1">Action</th>
            <th className="py-1 text-right">Price ({currentSymbol.id.split("/")[1] || "USD"})</th>
            <th className="py-1 text-right text-ellipsis overflow-hidden">Quantity</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900/40">
          {trades.map((trade, i) => (
            <tr key={i} className="hover:bg-slate-900/40">
              <td className="py-1 text-slate-500">{trade.time}</td>
              <td className="py-1">
                <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase tracking-wider ${
                  trade.side === "buy" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {trade.side}
                </span>
              </td>
              <td className={`py-1 text-right font-bold ${trade.side === "buy" ? "text-emerald-300" : "text-rose-400"}`}>
                {trade.price.toLocaleString(undefined, { minimumFractionDigits: currentSymbol.precision })}
              </td>
              <td className="py-1 text-right text-slate-300">{trade.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
