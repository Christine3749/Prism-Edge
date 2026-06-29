import { BookOpen, ChevronDown, ChevronUp, Layers, Sparkles, TrendingUp } from "lucide-react";
import type { MarketDataStatus } from "../../../shared/src/types";
import type { BottomPanelTab, TranslationFn } from "./types";

interface BottomPanelTabsProps {
  activeTab: BottomPanelTab;
  collapsed: boolean;
  marketStatus?: MarketDataStatus;
  t: TranslationFn;
  onSelectTab: (tab: BottomPanelTab) => void;
  onToggleCollapsed: () => void;
  strategyMode?: boolean;
}

const tabItems = [
  { key: "book", icon: Layers, label: "orderBook", highlight: false },
  { key: "trades", icon: TrendingUp, label: "recentTrades", highlight: false },
  { key: "news", icon: BookOpen, label: "marketNews", highlight: false },
  { key: "ai", icon: Sparkles, label: "aiAnalysis", highlight: true }
] as const;

export function BottomPanelTabs({
  activeTab,
  collapsed,
  marketStatus,
  t,
  onSelectTab,
  onToggleCollapsed,
  strategyMode = false
}: BottomPanelTabsProps) {
  return (
    <div className={`px-2 sm:px-2.5 border-b flex items-center justify-between h-8 select-none shrink-0 gap-2 transition-[background-color,border-color,box-shadow] duration-500 ${strategyMode ? "border-sky-500/20 bg-[#0a1220]/95 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)]" : "border-slate-800 bg-slate-900"}`}>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
        {tabItems.map(({ key, icon: Icon, label, highlight }) => {
          const active = activeTab === key && !collapsed;
          return (
            <button
              key={key}
              onClick={() => onSelectTab(key)}
              className={`h-7 px-2 text-[10px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all outline-none border-b-2 hover:text-white cursor-pointer ${
                active
                  ? `border-cyan-500 text-white ${highlight ? "bg-cyan-950/10" : "bg-slate-950/40"}`
                  : `border-transparent ${highlight ? "text-slate-400" : "text-slate-500"}`
              }`}
            >
              <Icon className={`h-3 w-3 text-cyan-400 ${highlight ? "animate-pulse" : ""}`} />
              <span className={highlight ? "text-cyan-400" : undefined}>{t(label)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="text-[9px] uppercase font-mono font-bold tracking-widest text-slate-500 hidden lg:block">
          {strategyMode ? "Prism Workbench" : "Prism Console"} · {marketStatus?.state || "feed"}
        </div>
        <button
          onClick={onToggleCollapsed}
          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer transition-all self-center"
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
