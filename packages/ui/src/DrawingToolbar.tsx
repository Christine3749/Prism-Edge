import React, { useState } from "react";
import { 
  ArrowUpRight, Minus, MousePointer,
  Type as TextIcon, Ruler as RulerIcon, Trash2, ChevronRight, ChevronLeft
} from "lucide-react";
import { DrawingTool } from "../../shared/src/types";
import { Language } from "../../shared/src/translations";

interface DrawingToolbarProps {
  activeTool: DrawingTool;
  onSelectTool: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  drawingsCount: number;
  lang: Language;
}

export default function DrawingToolbar({
  activeTool,
  onSelectTool,
  onClearDrawings,
  drawingsCount,
  lang
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
      <div className={`hidden sm:flex shrink-0 flex-col items-center py-3 justify-between bg-slate-950 border-r border-slate-800 transition-all duration-300 z-30 ${collapsed ? "w-8" : "w-14"}`}>
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
                        ? "bg-cyan-500 text-slate-950 shadow-lg font-bold scale-105" 
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
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
              className="w-8 h-6 flex items-center justify-center rounded hover:bg-slate-900 text-slate-500 hover:text-slate-200 cursor-pointer transition-all mt-4"
              title={lang === "zh" ? "收起侧栏" : lang === "tc" ? "收起側欄" : "Minimize panel"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="w-8 h-full flex items-center justify-center text-slate-500 hover:text-cyan-400 hover:bg-slate-900/60 cursor-pointer transition-all"
            title={lang === "zh" ? "展开绘图工具" : lang === "tc" ? "展開繪圖工具" : "Expand Drawing Tools"}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Mobile Floating Horizontal Tool Tray (Visible ONLY on Mobile) */}
      <div className="sm:hidden fixed bottom-14 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-2xl z-40 max-w-[95%] overflow-x-auto no-scrollbar">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          const texts = getToolText(t.id);
          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-all shrink-0 ${
                isActive 
                  ? "bg-cyan-500 text-slate-950 shadow-md font-bold scale-105" 
                  : "text-slate-400 hover:text-white"
              }`}
              title={texts.label}
            >
              {t.icon}
            </button>
          );
        })}
        {drawingsCount > 0 && (
          <div className="w-px h-5 bg-slate-800 shrink-0 mx-0.5"></div>
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
