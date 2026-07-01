import React, { useState } from "react";
import { 
  ArrowUpRight, Minus, MousePointer,
  Type as TextIcon, Ruler as RulerIcon, Trash2, ChevronRight, ChevronLeft
} from "lucide-react";
import { DrawingTool } from "../../shared/src/types";
import { Language } from "../../shared/src/translations";

type WorkspaceDeck = 1 | 2;

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  drawingsCount: number;
  lang: Language;
  activeWorkspaceDeck?: WorkspaceDeck;
  onWorkspaceDeckSelect?: (deck: WorkspaceDeck) => void;
}

export default function DrawingToolbar({
  activeTool,
  onSelectTool,
  onClearDrawings,
  drawingsCount,
  lang,
  activeWorkspaceDeck = 1,
  onWorkspaceDeckSelect
}: DrawingToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const getToolText = (toolId: string) => {
    switch (toolId) {
      case "cursor":
        return {
          label: lang === "zh" ? "指针 Pointer" : lang === "tc" ? "指針 Pointer" : "Pointer",
          tip: lang === "zh" ? "导航、选中与控制" : lang === "tc" ? "導航、選中與控制" : "Navigate & modify"
        };
      case "trendline":
        return {
          label: lang === "zh" ? "趋势线 Trendline" : lang === "tc" ? "趨勢線 Trendline" : "Trendline",
          tip: lang === "zh" ? "定义支撑和阻力水平" : lang === "tc" ? "定義支撐和阻力水平" : "Define manual trend levels"
        };
      case "horizalline":
        return {
          label: lang === "zh" ? "水平线 Horizontal" : lang === "tc" ? "水平線 Horizontal" : "Horizontal",
          tip: lang === "zh" ? "水平坐标标定参考线" : lang === "tc" ? "水平坐標標定參考線" : "Horizontal reference line"
        };
      case "ray":
        return {
          label: lang === "zh" ? "射线 Ray Line" : lang === "tc" ? "射線 Ray Line" : "Ray Line",
          tip: lang === "zh" ? "单向无限延长趋势向量" : lang === "tc" ? "單向無限延長趨勢向量" : "Infinite directional vector"
        };
      case "fibonacci":
        return {
          label: lang === "zh" ? "斐波那契 Fibonacci" : lang === "tc" ? "斐波那契 Fibonacci" : "Fibonacci",
          tip: lang === "zh" ? "斐波那契黄金分割百分比" : lang === "tc" ? "斐波那契黃金分割百分比" : "Fibonacci retracement grids"
        };
      case "text":
        return {
          label: lang === "zh" ? "文字标签 Text Note" : lang === "tc" ? "文字標籤 Text Note" : "Text Note",
          tip: lang === "zh" ? "在任意位置标示文字说明" : lang === "tc" ? "在任意位置標示文字說明" : "Place structural observations"
        };
      case "ruler":
        return {
          label: lang === "zh" ? "测量尺 Ruler" : lang === "tc" ? "測量尺 Ruler" : "Measure Ruler",
          tip: lang === "zh" ? "测算选中时间价格的空间波幅" : lang === "tc" ? "測算選中時間價格的空間波幅" : "Calculate price/time deltas"
        };
      default:
        return { label: "", tip: "" };
    }
  };

  const tools = [
    { 
      id: "cursor" as DrawingTool, 
      label: "Pointer", 
      icon: <MousePointer className="h-4 w-4" />, 
      tip: "Navigate & modify" 
    },
    { 
      id: "trendline" as DrawingTool, 
      label: "Trendline", 
      icon: <ArrowUpRight className="h-4 w-4" />, 
      tip: "Define manual trend levels" 
    },
    { 
      id: "horizalline" as DrawingTool, 
      label: "Horizontal", 
      icon: <Minus className="h-4 w-4" />, 
      tip: "Horizontal reference line" 
    },
    { 
      id: "ray" as DrawingTool, 
      label: "Ray Line", 
      icon: <span className="font-mono font-extrabold text-[11px] leading-none">➔</span>, 
      tip: "Infinite directional vector" 
    },
    { 
      id: "fibonacci" as DrawingTool, 
      label: "Fibonacci", 
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4 stroke-[2]">
          <line x1="4" y1="4" x2="20" y2="4" />
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="14" x2="20" y2="14" />
          <line x1="4" y1="20" x2="20" y2="20" />
        </svg>
      ), 
      tip: "Fibonacci retracement grids" 
    },
    { 
      id: "text" as DrawingTool, 
      label: "Text Note", 
      icon: <TextIcon className="h-4 w-4" />, 
      tip: "Place structural observations" 
    },
    { 
      id: "ruler" as DrawingTool, 
      label: "Measure Ruler", 
      icon: <RulerIcon className="h-4 w-4" />, 
      tip: "Calculate price/time deltas" 
    }
  ];

  return (
    <>
      {/* Desktop Vertical Layout (Hidden on Mobile) */}
      <div className={`hidden sm:flex shrink-0 flex-col items-center py-3 justify-between bg-[#000814] border-r border-[#12324a] transition-all duration-300 z-30 ${collapsed ? "w-8" : "w-14"}`}>
        {!collapsed ? (
          <>
            {/* Drawing Tools List */}
            <div className="flex flex-col gap-1.5 w-full items-center">
              {tools.map((t) => {
                const isActive = activeTool === t.id;
                const texts = getToolText(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTool(t.id)}
                    className={`w-10 h-10 flex items-center justify-center rounded-md transition-all duration-150 group relative cursor-pointer ${
                      isActive 
                        ? "bg-[#123a63] text-blue-50 shadow-lg font-bold scale-105" 
                        : "text-slate-400 hover:text-white hover:bg-[#031426]"
                    }`}
                    id={`drawing_tool_${t.id}`}
                    title={texts.label}
                    aria-label={`${texts.label}. ${texts.tip}`}
                  >
                    {t.icon}
                  </button>
                );
              })}
            </div>

            <div className="flex w-full flex-col items-center gap-2">
              <WorkspaceDeckSwitch
                activeDeck={activeWorkspaceDeck}
                lang={lang}
                onSelect={(deck) => onWorkspaceDeckSelect?.(deck)}
              />

              {/* Clear Drawings Utility */}
              {drawingsCount > 0 && (
                <button
                  onClick={onClearDrawings}
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-md text-rose-400 bg-rose-500/10 border border-rose-500/10 hover:bg-rose-500 hover:text-slate-950 transition-all cursor-pointer group relative hover:scale-105"
                  title={lang === "zh" ? `清除全部 ${drawingsCount} 个绘图` : lang === "tc" ? `清除全部 ${drawingsCount} 個繪圖` : `Clear all ${drawingsCount} drawings`}
                  aria-label={lang === "zh" ? `清除全部 ${drawingsCount} 个绘图` : lang === "tc" ? `清除全部 ${drawingsCount} 個繪圖` : `Clear all ${drawingsCount} drawings`}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-[8px] font-mono font-bold leading-none mt-0.5">{drawingsCount}</span>
                </button>
              )}

              {/* Collapse Trigger arrow */}
              <button
                onClick={() => setCollapsed(true)}
                className="w-8 h-6 flex items-center justify-center rounded hover:bg-[#031426] text-slate-500 hover:text-slate-200 cursor-pointer transition-all"
                title={lang === "zh" ? "收起侧栏" : lang === "tc" ? "收起側欄" : "Minimize panel"}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full w-8 flex-col items-center justify-between py-1">
            <button
              onClick={() => setCollapsed(false)}
              className="flex w-8 flex-1 items-center justify-center text-slate-500 transition-all hover:bg-[#031426]/72 hover:text-blue-300/75"
              title={lang === "zh" ? "展开绘图工具" : lang === "tc" ? "展開繪圖工具" : "Expand Drawing Tools"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <WorkspaceDeckSwitch
              activeDeck={activeWorkspaceDeck}
              compact
              lang={lang}
              onSelect={(deck) => onWorkspaceDeckSelect?.(deck)}
            />
          </div>
        )}
      </div>

      {/* Mobile Floating Horizontal Tool Tray (Visible ONLY on Mobile) */}
      <div className="sm:hidden fixed bottom-[calc(24vh+0.75rem)] left-1/2 -translate-x-1/2 bg-[#000814]/95 backdrop-blur-md border border-[#12324a] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xl z-40 max-w-[95%] overflow-x-auto no-scrollbar">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          const texts = getToolText(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all shrink-0 ${
                isActive 
                  ? "bg-[#123a63] text-blue-50 shadow-md font-bold scale-105" 
                  : "text-slate-400 hover:text-white"
              }`}
              title={texts.label}
            >
              {t.icon}
            </button>
          );
        })}
        {drawingsCount > 0 && (
          <div className="w-px h-5 bg-[#06213a] shrink-0 mx-0.5"></div>
        )}
        {drawingsCount > 0 && (
          <button
            onClick={onClearDrawings}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-500/10 text-rose-400 shrink-0"
            title={lang === "zh" ? `清除 ${drawingsCount} 个绘图` : lang === "tc" ? `清除 ${drawingsCount} 個繪圖` : `Clear ${drawingsCount} drawings`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </>
  );
}
function WorkspaceDeckSwitch({
  activeDeck,
  compact = false,
  lang,
  onSelect
}: {
  activeDeck: WorkspaceDeck;
  compact?: boolean;
  lang: Language;
  onSelect: (deck: WorkspaceDeck) => void;
}) {
  const zh = lang === "zh" || lang === "tc";
  const decks: WorkspaceDeck[] = [2, 1];
  const romanLabels: Record<WorkspaceDeck, string> = {
    1: "I",
    2: "II"
  };
  const labels: Record<WorkspaceDeck, string> = {
    1: zh ? "I 作战室：价格、假设、执行" : "I Workbench: price, thesis, execution",
    2: zh ? "II Trading Signals：空头、压力、事件" : "II Trading Signals: shorts, pressure, events"
  };

  return (
    <div
      data-workspace-deck-rail
      className={`grid grid-cols-1 gap-1 rounded-md border border-[#12324a]/55 bg-[#010813]/72 p-0.5 ${compact ? "w-7" : "w-10"}`}
    >
      {decks.map((deck) => {
        const active = activeDeck === deck;
        return (
          <button
            key={deck}
            type="button"
            data-workspace-deck-button
            data-active={active ? "true" : "false"}
            onClick={() => onSelect(deck)}
            aria-pressed={active}
            className={`${compact ? "h-5 text-[9px]" : "h-7 text-[11px]"} w-full rounded border font-black transition-[background-color,color,border-color] ${
              active
                ? "border-blue-400/35 bg-[#06233a] text-blue-100"
                : "border-transparent text-slate-500 hover:bg-[#031426]/90 hover:text-slate-200"
            }`}
            title={labels[deck]}
            aria-label={labels[deck]}
          >
            {romanLabels[deck]}
          </button>
        );
      })}
    </div>
  );
}

