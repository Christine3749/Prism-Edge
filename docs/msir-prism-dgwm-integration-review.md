# MSIR Prism x DGWM 动态几何量化融合评审报告

生成日期：2026-06-24  
评审对象：动态几何 / DGWM 论文作者与量化同事  
项目路径：`C:\Users\Ethan\Desktop\01-Projects\PrismEdge`  
量化模型路径：`C:\Users\Ethan\Desktop\01-Projects\GSYEN-Model\dgwm`  
论文路径：`C:\Users\Ethan\Desktop\05-Docs\动态几何_RLBoost\动态几何_谱分区条件化RLBoost融合版_最终.pdf`

## 1. 报告目的

MSIR Prism 不应只是漂亮图表，而应成为动态几何量化决策终端：可解释、可回测、可拒绝、可上线治理。

请同事重点审阅：

1. 本报告对论文与 DGWM 工程模块的理解是否准确。
2. 哪些动态几何对象必须先进入 MSIR Prism 第一版接口。
3. 哪些指标能证明系统比普通策略、普通多因子、普通 AI 预测更可靠。

## 2. 产品定位

建议定位：

> MSIR Prism 是动态几何量化决策终端，不是 TradingView 复刻，也不是黑箱喊单软件。

视觉上可以学习 TradingView 的图表密度和交互成熟度，但真正商业价值来自：

1. 对市场状态的结构化解释。
2. 对信号可信度的证据校准。
3. 对高风险状态的拒绝交易能力。
4. 对交易前后误差的闭环学习。
5. 对策略上线的 shadow / gray / production 治理。

## 3. 论文核心理解

论文中的动态几何不是无条件保证收益，而是一套条件化、可验证、可拒绝的结构风险框架。

核心链路：

```text
市场观测
  -> 动态几何状态
  -> 谱分区 / Riesz 投影
  -> 结构误差与谱间隙诊断
  -> Bellman 价值规划
  -> 成本后净奖励
  -> 风险 / 执行 / 容量 / 拥挤约束
  -> 允许交易、降级交易或拒绝交易
  -> 交易后 Bellman residual 回流高价值数据池
```

所以 MSIR Prism 最终不应只是 `预测涨跌 -> 给买卖点`，而应判断市场结构是否可交易、哪类策略有效、可下多大仓、何时必须拒绝，以及交易后错误应回流到哪个模型模块。

## 4. DGWM 工程模块观察

`dgwm` 不是单个模型，而是一个量化世界模型操作系统。已观察到的关键模块：

1. `extensions/domains/quant/release`
   - 市场数据、世界模型、验证、发布四阶段 release service。
   - 可作为 MSIR Prism 后端训练、回测、发布入口。

2. `extensions/domains/quant/observation`
   - Point-in-time 观测编译，包含行情、alternative data、venue、tradability、lineage、normalization。
   - 对 MSIR Prism 很重要，因为图表必须区分真实、延迟、模拟、不可交易数据。

3. `extensions/domains/quant/state`
   - 将市场、组合、风险、执行状态 materialize 成量化世界状态。
   - 这是前端 K 线和后端 DGWM 之间最重要的桥。

4. `extensions/domains/quant/risk/trade_permission.py`
   - 已有 `TradePermissionGate`。
   - 根据 EDG、谱间隙、Bellman residual、证据误差、执行误差、拥挤、容量等指标决定 attack、defensive、hedge only、reduce only、reject。
   - 这应成为 MSIR Prism 的核心差异化能力。

5. `extensions/domains/quant/planning/bellman`
   - 已有 learned game Bellman solver、backup、residual。
   - 系统目标不是简单分类，而是动作价值、场景、对手盘、风险约束下的决策。

6. `extensions/domains/quant/world/reward`
   - 已有净奖励组件聚合。
   - PnL 之外应扣除费用、滑点、冲击、风险、回撤、尾部、拥挤、执行、容量和不确定性。

7. `scripts/quant_fast_run.py`
   - 有硬件自适应、CUDA/CPU profile、运行性能报告。
   - MSIR Prism 应展示模型延迟、运行瓶颈和数据新鲜度。

## 5. 建议量化分析标准

MSIR Prism 的“量化标准”应覆盖市场状态、信号、拒绝交易、净奖励，而不是只定义买卖点。

市场状态建议输出：

1. `regime`：trend、reversal、range、liquidity stress、crowding、event shock 等。
2. `spectralGap`：谱间隙或工程近似。
3. `structuralError`：动态几何结构误差。
4. `coverage`：当前状态是否被历史有效样本覆盖。
5. `dataLineage`：数据来源、时间戳、是否 point-in-time、是否延迟。

信号建议输出：

1. 方向：buy、sell、hold、hedge、reduce。
2. 置信度：校准后的概率或分位数。
3. 有效 horizon：1m、15m、1h、1d、1w。
4. 触发依据：因子、谱区、Bellman value、净奖励组件。
5. 失效条件：哪些指标恶化后信号作废。

拒绝交易建议输出：

```json
{
  "allowed": false,
  "mode": "reject",
  "rejectReasons": [
    "spectral_gap_too_small",
    "bellman_residual_exceeded",
    "execution_error_exceeded"
  ],
  "requiredRepair": [
    "reduce_position",
    "enter_shadow_mode",
    "collect_execution_replay"
  ]
}
```

净奖励统一口径：

```text
netReward =
  grossPnl - fee - slippage - impact
  - riskPenalty - drawdownPenalty - tailPenalty
  - crowdingPenalty - executionPenalty
  - capacityPenalty - uncertaintyPenalty
```

## 6. 建议 API 合约

第一版不要把 DGWM 全部塞进前端。建议后端提供四层接口：

```http
POST /api/quant/state/compile
POST /api/analysis/run
POST /api/backtest/run
POST /api/release/evaluate
```

`/api/analysis/run` 建议返回：

```json
{
  "model": "dgwm-prism-adapter-v1",
  "regime": "trend",
  "trend": "bullish",
  "confidence": 0.72,
  "structuralError": 0.18,
  "spectralGap": 0.41,
  "bellmanResidual": 0.09,
  "netReward": { "mean": 0.014, "cvar": -0.006 },
  "tradePermission": {
    "allowed": true,
    "mode": "defensive",
    "reasons": []
  },
  "signals": [],
  "levels": { "support": [], "resistance": [] }
}
```

## 7. 前端展示建议

前端不要只显示“AI 分析一句话”。建议分四层：

1. 图表层：K 线、成交量、信号点、支撑压力、结构失效区。
2. 状态层：regime、spectral gap、structural error、Bellman residual、data freshness。
3. 决策层：allowed / defensive / hedge only / reduce only / reject。
4. 证据层：净奖励拆解、拒绝原因、样本覆盖、模型版本、数据 lineage。

用户真正需要回答的是：为什么现在可以交易，为什么现在不能交易，如果交易风险来自哪里，如果错了模型会如何学习。

## 8. 与头部量化机构的比较方式

不能用“看起来更聪明”作为比较标准。建议采用可复现实验指标：

1. 样本外 IR / Sharpe。
2. 成本后净收益。
3. 最大回撤。
4. 换手率调整后的 alpha。
5. 分 regime 胜率和收益贡献。
6. 拒绝交易带来的损失规避收益。
7. Bellman residual 下降速度。
8. shadow 到 paper 的偏差。
9. paper 到 live 的偏差。
10. 容量扩大后的收益衰减曲线。

如果要说“比幻方式系统更准”，建议定义为：

```text
在同一数据口径、同一交易成本、同一风险预算、同一容量约束下，
MSIR Prism 的成本后、样本外、拒绝机制后的风险调整收益更高，
并且 live 偏差更小。
```

## 9. 第一版 MVP 建议

第一版建议做 `DGWM Signal Review Mode`，不直接做自动实盘。

范围：

1. BTC/USDT、ETH/USDT、SOL/USDT 作为实时加密样本。
2. A 股指数、港股、美股作为延迟或日线样本。
3. 前端显示 DGWM 分析，但不执行真实下单。
4. 后端记录每次信号、拒绝、行情状态和后验表现。
5. 每日生成 review report。

MVP 输出：当前 regime、趋势方向、结构误差、谱稳定性、Bellman residual、交易许可、拒绝原因、净奖励拆解、后续需要补的数据。

## 10. 请同事重点审阅的问题

1. MSIR Prism 的第一版状态向量最小应该包含哪些字段？
2. 谱分区在实盘里应先用真实 Riesz 投影，还是先用工程近似指标？
3. `TradePermissionGate` 的阈值应如何校准？
4. 哪些 DGWM 模块已经可以被 MSIR Prism 后端直接调用？
5. 哪些模块还只是研究原型，不适合进入产品？
6. 回测中如何避免未来函数和 point-in-time 数据泄漏？
7. 影子交易最短需要跑多久，才能进入 paper？
8. 拒绝交易的收益贡献如何统计，避免事后美化？
9. Bellman residual 应如何分桶回流到高价值数据池？
10. 普通用户和研究员分别应看到多少解释？

## 11. 建议开发路线

1. Phase A：冻结 `AnalysisResult v2`，增加 `QuantDecision`、`TradePermission`、`NetRewardBreakdown`、`DataLineage` 类型。
2. Phase B：新增 `dgwm_adapter`，先用 mock + technical fallback 对齐字段。
3. Phase C：把 MSIR Prism 行情转成 DGWM observation，记录 source、latency、updatedAt、isLive、isDelayed、isSynthetic。
4. Phase D：做成本后回测、拒绝交易收益归因、shadow report。
5. Phase E：调用 `quant-diagnostic` 或 `quant-release`，接入 `TradePermissionGate`、Bellman residual、净奖励拆解。
6. Phase F：建立 research -> shadow -> paper -> gray -> live 上线治理。

## 12. 风险提醒

1. 论文中的高收益案例应作为研究示例，不能直接作为产品承诺。
2. 如果没有 point-in-time 数据治理，回测会天然高估。
3. 如果没有滑点、冲击、容量、拥挤，收益不可实盘化。
4. 如果没有拒绝机制，动态几何的最大优势无法体现。
5. 如果 UI 只展示买卖点，会把系统降级成普通喊单软件。
6. 如果后端没有模型版本、数据 lineage 和运行性能记录，结果不可审计。

## 13. 最终目标

MSIR Prism 最终应该成为：

```text
市场数据终端
  + 动态几何状态解释器
  + DGWM 量化世界模型
  + Bellman 决策与净奖励系统
  + 拒绝交易与风险门控
  + 回测 / shadow / paper / live 治理
  + 每日模型改进报告
```

真正的优势不是“每次都喊对”，而是让系统知道什么时候该出手、什么时候该少出手、什么时候必须不出手，以及错了以后该修哪个模型、哪批数据、哪个谱区、哪个执行模块。

请同事优先批注：哪些理论对象必须保留，哪些工程对象可以简化，以及第一版最小可验证闭环应如何设计。
