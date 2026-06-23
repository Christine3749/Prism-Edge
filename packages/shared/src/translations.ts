export type Language = "en" | "zh" | "tc";

export const TRANSLATIONS = {
  // Brand
  brandName: {
    en: "Prism-Edge",
    zh: "棱镜先生",
    tc: "稜鏡先生",
  },
  slogan: {
    en: "Find clear edge at the market boundary.",
    zh: "在市场边缘，看见清晰优势。",
    tc: "在市場邊緣，看見清晰優勢。",
  },
  brandTitle: {
    en: "Prism-Edge | Market Analyst",
    zh: "Prism-Edge｜棱镜先生",
    tc: "Prism-Edge｜稜鏡先生",
  },

  // Panels
  watchlist: {
    en: "Watchlist",
    zh: "自选列表",
    tc: "自選列表",
  },
  orderBook: {
    en: "Order Book",
    zh: "订单簿",
    tc: "訂單簿",
  },
  recentTrades: {
    en: "Recent Trades",
    zh: "最近成交",
    tc: "最近成交",
  },
  marketNews: {
    en: "Market News",
    zh: "市场新闻",
    tc: "市場新聞",
  },
  aiAnalysis: {
    en: "AI Analysis",
    zh: "AI 智能分析",
    tc: "AI 智能分析",
  },

  // Buttons & Controls
  techIndicators: {
    en: "Technical Indicators",
    zh: "技术指标",
    tc: "技術指標",
  },
  saveLayout: {
    en: "Save Layout",
    zh: "保存布局",
    tc: "儲存版面",
  },
  saved: {
    en: "Saved",
    zh: "已保存",
    tc: "已儲存",
  },
  resetDashboard: {
    en: "Reset Dashboard",
    zh: "重置终端",
    tc: "重置終端",
  },
  exportSnapshot: {
    en: "Export Snapshot",
    zh: "导出快照",
    tc: "匯出快照",
  },
  searchAsset: {
    en: "Search market assets...",
    zh: "搜索市场资产...",
    tc: "搜尋市場資產...",
  },
  selectMarkets: {
    en: "Select Markets",
    zh: "选择交易资产",
    tc: "選擇交易資產",
  },
  allMarkets: {
    en: "All Markets",
    zh: "全部资产",
    tc: "全部資產",
  },
  noAssetsFound: {
    en: "No assets found.",
    zh: "未检索到资产",
    tc: "未檢索到資產",
  },

  // Chart info / States
  liveWss: {
    en: "LIVE FEED",
    zh: "实时源",
    tc: "即時源",
  },
  simFeed: {
    en: "SIM FEED",
    zh: "模拟源",
    tc: "模擬源",
  },

  // Reset dialog
  resetTitle: {
    en: "Reset System Layout",
    zh: "重置系统布局",
    tc: "重置系統佈局",
  },
  resetContent: {
    en: "Are you sure you want to clear your local technical indicator overlays, drawings, settings, and watchlist data? This action cannot be undone.",
    zh: "确定要清除您本地的指标叠加、绘图、偏好设置和自选股列表吗？此操作不可撤销。",
    tc: "確定要清除您本地的指標疊加、繪圖、偏好設置和自選股列表嗎？此操作不可撤销。",
  },
  cancel: {
    en: "Cancel",
    zh: "取消",
    tc: "取消",
  },
  confirmResetBtn: {
    en: "Reset Layout",
    zh: "确认重置",
    tc: "確認重置",
  },
  toastResetSuccess: {
    en: "Workspace was successfully reset to defaults.",
    zh: "系统工作区已成功恢复默认设置。",
    tc: "系統工作區已成功恢復預設設置。",
  },
  toastScreenshot: {
    en: "Prism workspace screenshot exported to local download files.",
    zh: "棱镜先生工作区多维视窗截图已成功导出。",
    tc: "稜鏡先生工作區多維視窗截圖已成功匯出。",
  },

  // Watchlist Headers
  asset: {
    en: "Asset",
    zh: "资产代码",
    tc: "資產代碼",
  },
  price: {
    en: "Price",
    zh: "价格",
    tc: "價格",
  },
  change: {
    en: "Change",
    zh: "涨跌幅",
    tc: "漲跌幅",
  },
  volume24h: {
    en: "24h Vol",
    zh: "24h成交额",
    tc: "24h成交額",
  },

  // Order Book & Recent Trades Headers
  amount: {
    en: "Amount",
    zh: "数量",
    tc: "數量",
  },
  total: {
    en: "Total",
    zh: "累计",
    tc: "累計",
  },
  time: {
    en: "Time",
    zh: "时间",
    tc: "時間",
  },

  // Settings Modal
  terminalSettings: {
    en: "Prism-Edge Technical Terminals Settings",
    zh: "Prism-Edge 终端配置面板",
    tc: "Prism-Edge 終端配置面板",
  },
  generalConfig: {
    en: "General Hardware Layout",
    zh: "系统硬件与显示设置",
    tc: "系統硬體與顯示設置",
  },
  chartColorConfig: {
    en: "Candlestick Accent System",
    zh: "K线配色方案",
    tc: "K線配色方案",
  },
  gridLines: {
    en: "Draw Background Grid Lines",
    zh: "绘制背景网格线",
    tc: "繪製背景網格線",
  },
  solidBackground: {
    en: "High-Opacity Dark Solid Canvas",
    zh: "纯色极深暗黑画布",
    tc: "純色極深暗黑畫布",
  },
  intlColor: {
    en: "International Color scheme (Green-Up / Red-Down)",
    zh: "采用国际标准红绿 (绿涨红跌)",
    tc: "採用國際標準紅綠 (綠漲紅跌)",
  },
  theme: {
    en: "Terminal Theme Selection",
    zh: "终端主题选择",
    tc: "終端主題選擇",
  },
  upColor: {
    en: "Bullish Candle Fill Color",
    zh: "看涨金烛充能色",
    tc: "看漲金燭充能色",
  },
  downColor: {
    en: "Bearish Candle Empty Color",
    zh: "看跌赤烛充能色",
    tc: "看跌赤燭充能色",
  },
  timezone: {
    en: "Sync Reference Timezone",
    zh: "基准同步时区",
    tc: "基準同步時區",
  },
  saveSettings: {
    en: "Save Applied Config",
    zh: "应用并保存配置",
    tc: "套用並儲存配置",
  },

  // AI Analysis Panel
  aiAgentLabel: {
    en: "Quantum Prism Agent v4.1",
    zh: "棱镜分析矩阵 v4.1",
    tc: "稜鏡分析矩陣 v4.1",
  },
  aiDesc: {
    en: "Select a financial asset to run the real-time proprietary mathematical validation algorithm.",
    zh: "选择一款高流动性资产，自动运行棱证核心高级算法评级。",
    tc: "選擇一款高流動性資產，自動運行稜證核心高級演算法評級。",
  },
  aiStatus: {
    en: "Status",
    zh: "分析状态",
    tc: "分析狀態",
  },
  aiIdle: {
    en: "System idle, click below to validate.",
    zh: "分析内核已就绪，随时可进行压力测试评估。",
    tc: "分析內核已就緒，隨時可進行壓力測試評估。",
  },
  runAiReport: {
    en: "Generate AI Prism Report",
    zh: "运行 棱镜核心 AI 诊断",
    tc: "運行 稜鏡核心 AI 診斷",
  },
  analyzing: {
    en: "Simulating market scenarios...",
    zh: "核心芯片压力计算与模拟中...",
    tc: "核心晶片壓力計算與模擬中...",
  },
  overallScore: {
    en: "Overall Edge Score",
    zh: "棱镜大盘边缘综合评级",
    tc: "稜鏡大盤邊緣綜合評級",
  },
  aiMetrics: {
    en: "Composite Risk Signal Metrics",
    zh: "多维结构与混沌因子分析",
    tc: "多維結構與混沌因子分析",
  },
  aiStructuralTrend: {
    en: "Structural Trend Factor",
    zh: "1. 空间结构势能因子",
    tc: "1. 空間結構勢能因子",
  },
  aiLiquidityCluster: {
    en: "Liquidity Grab Cluster",
    zh: "2. 高密流动性吸附群",
    tc: "2. 高密流動性吸附群",
  },
  aiVolatilityIndex: {
    en: "Mean-Reverting Entropy Value",
    zh: "3. 均值回归瞬态熵值",
    tc: "3. 均值回歸瞬態熵值",
  },
  aiSummaryReport: {
    en: "Synthetic Risk Assessment Summary",
    zh: "棱证核心：多参数动态归纳报告",
    tc: "稜證核心：多參數動態歸納報告",
  },

  // Indicators
  overlaySettings: {
    en: "Main Overlay Technical Indicators",
    zh: "主图技术指标（EMA / SMA / BOLL）",
    tc: "主圖技術指標（EMA / SMA / BOLL）",
  },
  subOverlaySettings: {
    en: "Sub Panel Auxiliary Oscillators",
    zh: "副图辅助震荡器（RSI / MACD）",
    tc: "副圖輔助震盪器（RSI / MACD）",
  },
  closeBtn: {
    en: "Apply and Close",
    zh: "确认应用并关闭",
    tc: "確認套用並關閉",
  },

  // Drawing Toolbar
  cursor: {
    en: "Cursor",
    zh: "十字光标",
    tc: "十字光標",
  },
  trendline: {
    en: "Trend Line",
    zh: "趋势线",
    tc: "趨勢線",
  },
  horizalline: {
    en: "Horizontal Line",
    zh: "水平射线",
    tc: "水平射線",
  },
  ray: {
    en: "Infinite Ray",
    zh: "无穷射线",
    tc: "無窮射線",
  },
  fibonacci: {
    en: "Fibonacci Retracement",
    zh: "斐波那契回调",
    tc: "斐波那契回調",
  },
  text: {
    en: "Label Note",
    zh: "文字标签",
    tc: "文字標籤",
  },
  ruler: {
    en: "Price Ruler",
    zh: "测距画尺",
    tc: "測距畫尺",
  },
  deleteDrawing: {
    en: "Clear drawings",
    zh: "清空画线",
    tc: "清空畫線",
  },

  // Drawing Help
  drawingCompleted: {
    en: "Drawing Completed",
    zh: "画线已完成",
    tc: "畫線已完成",
  },
} as const;

export function useTranslation(lang: Language) {
  return function t(key: keyof typeof TRANSLATIONS): string {
    const translation = TRANSLATIONS[key];
    if (!translation) return String(key);
    return translation[lang] || translation["zh"];
  };
}
