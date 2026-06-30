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

const workbenchChannels = ["THESIS", "EVENTS", "PRESSURE", "RISK", "DGWM", "NEXT ACTION"];

export function BottomPanelTabs({
  activeTab,
  collapsed,
  marketStatus,
  t,
  onSelectTab,
  onToggleCollapsed,
  strategyMode = false
}: BottomPanelTabsProps) {
  if (strategyMode) {
    return (
      <div className="flex h-8 shrink-0 select-none items-center justify-between gap-2 border-b border-[#12324a] bg-[#000814] px-2.5">
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
          <div className="flex h-8 shrink-0 items-center gap-1.5 border-r border-[#12324a] bg-blue-500/25 px-3 font-mono text-[8px] font-black uppercase tracking-[0.24em] text-blue-100/80 shadow-[inset_0_-2px_0_rgba(54,96,130,0.75)]">
            <Sparkles className="h-3 w-3" />
            Single Asset Workbench
          </div>
          {workbenchChannels.map((item, index) => (
            <span
              key={item}
              className={`shrink-0 border-r border-[#0c253a] px-3 py-2 font-mono text-[8px] font-black uppercase tracking-[0.2em] ${index === 0 ? "bg-blue-500/25 text-blue-200/75" : "text-slate-500"}`}
            >
              {item}
            </span>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden font-mono text-[8px] font-black uppercase tracking-widest text-slate-500 lg:block">
            Prism Workbench / {marketStatus?.state || "feed"}
          </div>
          <button
            onClick={onToggleCollapsed}
            className="grid h-6 w-6 place-items-center border border-[#1d4d6d] bg-[#031426] text-slate-400 transition-colors hover:border-blue-500/30 hover:text-white"
            title={collapsed ? "Expand panel" : "Collapse panel"}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-8 shrink-0 select-none items-center justify-between gap-2 border-b border-[#12324a] bg-[#031426] px-2 transition-[background-color,border-color,box-shadow] duration-500 sm:px-2.5">
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto no-scrollbar">
        {tabItems.map(({ key, icon: Icon, label, highlight }) => {
          const active = activeTab === key && !collapsed;
          return (
            <button
              key={key}
              onClick={() => onSelectTab(key)}
              className={`flex h-7 cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-2 text-[10px] font-bold outline-none transition-all hover:text-white ${
                active
                  ? `border-blue-600/35 text-white ${highlight ? "bg-[#071f36]/18" : "bg-[#000814]/60"}`
                  : `border-transparent ${highlight ? "text-slate-400" : "text-slate-500"}`
              }`}
            >
              <Icon className={`h-3 w-3 text-blue-300/75 ${highlight ? "animate-pulse" : ""}`} />
              <span className={highlight ? "text-blue-300/75" : undefined}>{t(label)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden font-mono text-[9px] font-bold uppercase tracking-widest text-slate-500 lg:block">
          Prism Console / {marketStatus?.state || "feed"}
        </div>
        <button
          onClick={onToggleCollapsed}
          className="cursor-pointer self-center rounded p-1 text-slate-400 transition-all hover:bg-[#06213a] hover:text-white"
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
