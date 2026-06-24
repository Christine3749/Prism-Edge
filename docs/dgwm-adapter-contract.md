# MSIR Prism DGWM Adapter Contract

生成日期：2026-06-24  
目标：把 MSIR Prism 的行情、分析、回测请求稳定接入 `GSYEN-Model/dgwm`。

## 1. 边界原则

前端不直接调用 DGWM。前端只调用 MSIR Prism API，后端 adapter 负责：

1. 编译行情状态。
2. 调用技术 fallback 或 DGWM。
3. 标记数据 lineage、模型版本、运行状态。
4. 返回统一 `AnalysisResult v2` / `QuantDecision`。

## 2. 当前 Adapter

当前文件：

```text
services/quant/dgwm_adapter.py
```

当前版本：

```text
dgwm-prism-adapter-v0
```

当前能力：

1. 探测 DGWM 路径和关键文件。
2. 编译 MSIR Prism candles 为 `msir.prism.dgwm.state.v1`。
3. 调用 `prism-edge-technical-v1` 生成 DGWM-shaped decision。
4. 提供轻量 rolling-window backtest。

当前不会直接启动 DGWM 重训练或 release，这一步等 request schema、数据路径、运行耗时可控后再打开。

## 3. API

### Health

```http
GET /api/quant/health
```

返回 DGWM 根路径、关键文件存在性和 Python import 探测结果。

### State Compile

```http
POST /api/quant/state/compile
```

请求：

```json
{
  "symbol": "BTC/USDT",
  "interval": "1h",
  "candles": [],
  "indicators": ["SMA", "EMA"],
  "source": "msir-prism",
  "provider": "frontend"
}
```

返回：

```json
{
  "schema": "msir.prism.dgwm.state.v1",
  "stateId": "stable_hash",
  "symbol": "BTC/USDT",
  "interval": "1h",
  "features": {
    "lastClose": 65000,
    "return1": 0.001,
    "return5": 0.02,
    "return20": 0.08,
    "volatility30": 0.014,
    "volumeRatio20": 1.2,
    "candleCount": 200
  }
}
```

### Decision

```http
POST /api/quant/decision/run
```

返回 `AnalysisResult v2` 加：

```json
{
  "adapter": {
    "name": "dgwm-prism-adapter-v0",
    "stateId": "stable_hash",
    "runtime": "technical-decision-bridge"
  },
  "state": {}
}
```

### Backtest

```http
POST /api/backtest/run
```

当前是轻量 rolling-window 验证，用于检查拒绝交易、净奖励和最大回撤的接口形状。

前端 `AI 智能分析` 面板已接入轻量 `Quant Lab`：

1. `GET /api/quant/health` 显示 DGWM adapter 是否连通。
2. `POST /api/backtest/run` 由用户手动触发，避免每次行情刷新都跑回测。
3. 如果 FastAPI 暂时没起来，Node 网关会返回 `node-quant-bridge` 健康状态。
4. Backtest 会自动降级到 `node-backtest-fallback-v1`，保持同结构摘要，避免页面卡死。

## 4. 下一步接真 DGWM

1. 确认 DGWM 最小 request：`symbols`、`start`、`end`、`market`、`world`、`output_dir`。
2. 增加 `DGWM_ROOT` 环境变量配置。
3. 将 `/api/quant/decision/run` 从 technical bridge 改成 DGWM runtime readout。
4. 将 `/api/backtest/run` 从轻量 replay 改成 `quant-diagnostic` 或 release validation。
5. 把 DGWM 的 rejection、EDG、Bellman、净奖励、shadow 结果映射回 MSIR Prism UI。

## 5. 同事审阅点

1. `state.compile` 的 feature 是否足够作为第一版最小状态。
2. DGWM 是否已有更合适的 runtime inference 入口，不需要走 release。
3. Backtest 第一版应先用 `quant-diagnostic`，还是先接 validation runner。
4. 哪些 rejection reason 应直接展示给用户，哪些只给研究员。
