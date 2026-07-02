# Prism-Edge 成功系统分解

本文件基于当前原项目文件夹 `C:\Users\Ethan\Desktop\01-Projects\Prism-Edge` 拆解，不创建快捷方式，不迁移项目目录。

## 1. 系统目标

Prism-Edge 是一个跨平台市场分析终端，目标是把行情、图表、指标、AI/量化分析、会员权限和后续回测能力整合成一个可运行、可扩展、可部署的交易研究工作台。

成功系统的核心标准：

- 前端终端可以稳定展示行情、图表、指标、信号扫描器、观察列表和底部分析面板。
- Node 网关统一承接浏览器请求、市场数据、会员权限、分析代理和本地 fallback。
- Python/FastAPI 量化服务提供结构化分析结果，保持和前端契约一致。
- 共享类型和市场目录让前后端数据形状稳定。
- 构建、类型检查和 API 编译检查可以短命令完成，不依赖 Codex 启动长期本地服务。

## 2. 前端终端层

入口：

- `apps/web/src/App.tsx`
- `apps/web/src/PrismEdgeTerminal.tsx`
- `packages/ui/src/*`
- `packages/shared/src/*`

职责：

- 路由：`/login`、`/membership`、默认交易终端。
- 交易终端状态：当前标的、K 线、指标、画线、语言、主题、观察列表、分析结果。
- UI 组件：Header、ChartContainer、DrawingToolbar、SignalScanner、BottomPanel、Watchlist、SettingsModal、IndicatorsModal。
- 本地持久化：画线、指标、设置、观察列表和收藏。
- 云同步：登录后同步收藏标的。

成功状态：

- 打开终端后默认标的可加载。
- 切换市场、周期、图表类型不会破坏布局。
- 指标、画线、收藏和设置可以保存。
- 分析面板可以接收 `AnalysisRunResponse` 并展示同形结果。

## 3. Node 网关层

入口：

- `server.ts`
- `server/apiRoutes.ts`
- `server/marketGateway.ts`
- `server/wsGateway.ts`
- `server/analysisFallback.ts`
- `server/backtestFallback.ts`
- `server/hsMembership.ts`

职责：

- 提供浏览器访问入口和 API 网关。
- 代理 `/api/analysis/run` 到 FastAPI。
- 当 FastAPI 不可达时返回同形本地分析 fallback。
- 提供市场搜索、K 线、报价、新闻、回测和会员权限路由。
- 通过 WebSocket 提供实时行情通道。

成功状态：

- `/api/health` 能返回网关状态；FastAPI 不可达时显示 degraded，而不是让前端崩溃。
- `/api/market/search`、`/api/market/klines`、`/api/market/quote` 能返回标准市场数据。
- 会员限制路由能正确拒绝或放行量化、回测、模型注册表等功能。
- fallback 结果和 FastAPI 结果保持同一响应形状。

## 4. Python 量化服务层

入口：

- `services/api/app/main.py`
- `services/api/app/routes/quant.py`
- `services/api/app/schemas.py`
- `services/quant/prism_edge_quant/engine.py`
- `services/quant/dgwm_adapter.py`
- `services/quant/dgwm_runtime.py`

职责：

- FastAPI 提供量化服务边界。
- `/api/analysis/run` 输出趋势、结构、信号、支撑压力、交易许可和诊断字段。
- `/api/quant/*` 预留并承接 DGWM/MSIR Prism 适配。
- `schemas.py` 固定请求和响应契约。

成功状态：

- 分析请求包含合法 candles 时返回 `AnalysisRunResponse`。
- 空或非法 candles 返回 400，而不是产生错误结果。
- `structuralError`、`spectralGap`、`bellmanResidual`、`netReward`、`tradePermission` 字段稳定存在。
- DGWM runtime 可以在不改变前端契约的前提下替换当前技术分析引擎。

## 5. 共享契约层

入口：

- `packages/shared/src/types.ts`
- `packages/shared/src/quantTypes.ts`
- `packages/shared/src/marketCatalog.ts`
- `packages/shared/src/marketUniverse/*`
- `docs/api-contract.md`
- `docs/model-contract.md`
- `docs/dgwm-adapter-contract.md`

职责：

- 定义前端、Node 网关、Python 服务之间的数据结构。
- 统一市场标的、市场类型、周期、行情状态、分析响应和量化字段。
- 让新增市场、新模型、新 UI 展示都围绕同一契约扩展。

成功状态：

- 前端组件使用共享类型，不私自发明后端字段。
- Node fallback 和 FastAPI 使用同一响应形状。
- 文档里的 API 示例和实际类型保持同步。

## 6. 数据流

主数据流：

1. 用户在前端选择标的和周期。
2. `useMarketRuntime` 向 Node 网关请求 K 线和报价。
3. Node 网关按标的类型选择 Binance、Coinbase、Yahoo delayed 或模拟 fallback。
4. K 线进入 `ChartContainer` 渲染。
5. `useAnalysisRunner` 把 candles、symbol、interval、indicators 发给 `/api/analysis/run`。
6. Node 网关转发到 FastAPI；失败时使用本地 fallback。
7. 分析结果回到 `PrismEdgeTerminal`，再分发到图表、扫描器和底部面板。

权限数据流：

1. 登录页获取会员身份 token。
2. Node 网关通过 HS/Supabase 相关接口校验会员状态。
3. 量化实验室、模型注册表、回测、runtime diagnostic 等功能按 feature key 放行。
4. 前端根据接口返回展示可用或受限状态。

## 7. 验收命令

这些命令是短生命周期命令，符合本项目 AGENTS.md 规则：

```powershell
npm run lint
npm run build
npm run api:check
git status --short
```

不在 Codex shell 中运行：

```powershell
npm run dev
npm start
node dist/server.cjs
vite
next dev
```

如果需要预览本地页面，由用户在自己的终端启动服务，Codex 只做短命令检查、日志读取和一次性健康检查。

## 8. 下一步拆解优先级

优先级建议：

1. 稳定前端布局状态：终端布局、Scanner 展开、Watchlist 压缩、BottomPanel 策略模式。
2. 稳定市场数据：搜索、K 线、报价、source/isLive/stale/simulated 状态。
3. 稳定分析契约：Node fallback、FastAPI engine、DGWM adapter 输出保持同形。
4. 稳定会员权限：登录、免费激活、收藏云同步、feature gate。
5. 稳定部署路径：Vercel/GCP/Docker 文档与实际 build 结果一致。
6. 稳定回测和 runtime diagnostic：限制超时、输入大小、错误返回和 UI 展示。

