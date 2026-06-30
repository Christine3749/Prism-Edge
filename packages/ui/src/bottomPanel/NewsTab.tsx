import type { Language } from "../../../shared/src/translations";
import type { NewsItem } from "../../../shared/src/types";

interface NewsTabProps {
  news: NewsItem[];
  newsLoading: boolean;
  lang: Language;
}

export function NewsTab({ news, newsLoading, lang }: NewsTabProps) {
  if (newsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-slate-500 gap-1.5">
        <span className="h-4 w-4 rounded-full border-2 border-blue-500/30 border-t-transparent animate-spin"></span>
        <span>{lang === "zh" ? "正在连接安全市场数据源..." : lang === "tc" ? "正在連接安全市場數據源..." : "Connecting to secure market feeds..."}</span>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-44 sm:max-h-none overflow-y-auto pr-1">
        {news.map((item) => {
          const isBullish = item.sentiment === "bullish";
          const isBearish = item.sentiment === "bearish";
          return (
            <div key={item.id} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5 hover:border-slate-700 transition-all flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500 font-semibold">{item.source} • {item.time}</span>
                  <span className={`px-1.5 py-0.2 rounded uppercase font-mono text-[8px] font-bold ${
                    isBullish ? "bg-emerald-500/20 text-emerald-300" : isBearish ? "bg-rose-500/10 text-rose-400" : "bg-slate-500/10 text-slate-400"
                  }`}>
                    {item.sentiment}
                  </span>
                </div>
                <h4 className="text-slate-100 font-bold text-xs tracking-tight line-clamp-1 hover:text-white leading-normal">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
