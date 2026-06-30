from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import os
from pathlib import Path
from typing import Any

from services.quant.dgwm_runtime import DgwmRuntime, DgwmRuntimeConfig
from services.quant.prism_edge_quant.engine import run_analysis


DEFAULT_DGWM_ROOT = Path(r"C:\Users\Ethan\Desktop\01-Projects\GSYEN-Model\dgwm")


@dataclass(frozen=True, slots=True)
class DgwmAdapterConfig:
    root: Path = DEFAULT_DGWM_ROOT
    adapter_version: str = "dgwm-prism-adapter-v0"
    runtime_timeout_seconds: int = 120


class DgwmAdapter:
    """Thin boundary between MSIR Prism payloads and the DGWM quant project."""

    def __init__(self, config: DgwmAdapterConfig | None = None) -> None:
        env_root = os.getenv("DGWM_ROOT", "").strip()
        env_timeout = os.getenv("DGWM_RUNTIME_TIMEOUT_SECONDS", "").strip()
        timeout = int(env_timeout) if env_timeout.isdigit() else 120
        self.config = config or DgwmAdapterConfig(
            root=Path(env_root) if env_root else DEFAULT_DGWM_ROOT,
            runtime_timeout_seconds=timeout,
        )
        self.runtime = DgwmRuntime(DgwmRuntimeConfig(root=self.config.root, timeout_seconds=self.config.runtime_timeout_seconds))

    def health(self) -> dict[str, Any]:
        root = self.config.root
        files = {
            "cli_quant": root / "cli" / "quant.py",
            "release_service": root / "extensions" / "domains" / "quant" / "release" / "service.py",
            "trade_permission": root / "extensions" / "domains" / "quant" / "risk" / "trade_permission.py",
            "bellman_solver": root / "extensions" / "domains" / "quant" / "planning" / "bellman" / "solver.py",
        }
        runtime_health = self.runtime.health()
        return {
            "adapter": self.config.adapter_version,
            "root": str(root),
            "exists": root.exists(),
            "importable": bool(runtime_health["registryImportable"]),
            "runtime": runtime_health,
            "files": {name: path.exists() for name, path in files.items()},
        }

    def compile_state(self, payload: dict[str, Any]) -> dict[str, Any]:
        symbol = str(payload.get("symbol") or "UNKNOWN")
        interval = str(payload.get("interval") or payload.get("timeframe") or "1D")
        candles = _normalize_candles(payload.get("candles"))
        if not candles:
            raise ValueError("candles must include numeric close prices")
        closes = [item["close"] for item in candles]
        volumes = [item["volume"] for item in candles]
        returns = _returns(closes)
        volatility = _std(returns[-30:])
        latest = candles[-1]
        state = {
            "schema": "msir.prism.dgwm.state.v1",
            "stateId": _stable_id({"symbol": symbol, "interval": interval, "last": latest}),
            "symbol": symbol,
            "interval": interval,
            "timestamp": latest["time"],
            "features": {
                "lastClose": latest["close"],
                "return1": returns[-1] if returns else 0.0,
                "return5": _window_return(closes, 5),
                "return20": _window_return(closes, 20),
                "volatility30": volatility,
                "volumeRatio20": _volume_ratio(volumes),
                "candleCount": len(candles),
            },
            "lineage": {
                "source": str(payload.get("source") or "msir-prism"),
                "provider": str(payload.get("provider") or "frontend"),
                "compiledAt": datetime.now(timezone.utc).isoformat(),
                "dgwmRoot": str(self.config.root),
                "dgwmAvailable": bool(self.health()["exists"]),
            },
        }
        return state

    def run_decision(self, payload: dict[str, Any]) -> dict[str, Any]:
        state = self.compile_state(payload)
        candles = _normalize_candles(payload.get("candles"))
        analysis = run_analysis(
            symbol=state["symbol"],
            interval=state["interval"],
            candles=candles,
            indicators=list(payload.get("indicators") or []),
        )
        if _runtime_requested(payload):
            try:
                diagnostic = self.runtime.run_diagnostic(payload, candles)
            except Exception as exc:
                diagnostic = _runtime_exception(exc)
            _merge_runtime_diagnostic(analysis, diagnostic)
        analysis["adapter"] = {
            "name": self.config.adapter_version,
            "dgwm": self.health(),
            "stateId": state["stateId"],
            "runtime": analysis["meta"]["engine"],
        }
        analysis["state"] = state
        return analysis

    def run_backtest(self, payload: dict[str, Any]) -> dict[str, Any]:
        symbol = str(payload.get("symbol") or "UNKNOWN")
        interval = str(payload.get("interval") or "1D")
        candles = _normalize_candles(payload.get("candles"))
        horizon = _clamp_horizon(payload.get("horizon"))
        window = _clamp_window(payload.get("window"), len(candles) - horizon - 1)
        cost_bps = _clamp_cost_bps(payload.get("costBps"))
        cost = cost_bps / 10000.0
        if len(candles) < window + horizon + 1:
            raise ValueError(f"backtest requires at least {window + horizon + 1} candles for window={window}, horizon={horizon}")
        decisions = []
        equity = 1.0
        peak = 1.0
        max_drawdown = 0.0
        previous_position = 0
        active_bars = 0
        trades = 0
        wins = 0
        accepted_count = 0
        gross_sum = 0.0
        first_index = window - 1
        last_index = len(candles) - 1 - horizon
        for index in range(first_index, last_index + 1):
            slice_candles = candles[index - window + 1:index + 1]
            result = run_analysis(symbol, interval, slice_candles, list(payload.get("indicators") or []))
            allowed = bool(result["tradePermission"]["allowed"])
            if allowed:
                accepted_count += 1
            position = _position_for_result(result) if allowed else 0
            entry_close = float(candles[index]["close"])
            exit_close = float(candles[index + horizon]["close"])
            forward_return = exit_close / entry_close - 1.0 if entry_close else 0.0
            gross_pnl = position * forward_return
            turnover = abs(position - previous_position)
            net_pnl = gross_pnl - turnover * cost
            if turnover > 0 and position != 0:
                trades += 1
            if position != 0:
                active_bars += 1
                gross_sum += gross_pnl
                if net_pnl > 0:
                    wins += 1
            equity *= 1.0 + net_pnl
            peak = max(peak, equity)
            max_drawdown = max(max_drawdown, (peak - equity) / peak if peak else 0.0)
            previous_position = position
            decisions.append({
                "time": slice_candles[-1]["time"],
                "mode": result["tradePermission"]["mode"],
                "allowed": allowed,
                "position": position,
                "forwardReturn": round(forward_return, 6),
                "netReward": round(net_pnl, 6),
                "regime": result["regime"],
            })
        sample_count = len(decisions)
        cumulative_return = round(equity - 1.0, 6)
        buy_hold_return = round(candles[last_index]["close"] / candles[first_index]["close"] - 1.0, 6)
        return {
            "schema": "msir.prism.dgwm.backtest.v2-realized",
            "adapter": f"{self.config.adapter_version}-realized",
            "symbol": symbol,
            "interval": interval,
            "window": window,
            "horizon": horizon,
            "costBps": cost_bps,
            "sampleCount": sample_count,
            "activeBars": active_bars,
            "trades": trades,
            "acceptedSignals": accepted_count,
            "rejectedSignals": sample_count - accepted_count,
            "exposurePct": round(active_bars / sample_count, 4) if sample_count else 0.0,
            "winRate": round(wins / active_bars, 4) if active_bars else 0.0,
            "avgReturnPerActiveBar": round(gross_sum / active_bars, 6) if active_bars else 0.0,
            "cumulativeReturn": cumulative_return,
            "buyHoldReturn": buy_hold_return,
            "excessReturn": round(cumulative_return - buy_hold_return, 6),
            "maxDrawdown": round(max_drawdown, 6),
            "decisions": decisions[-25:],
        }


def _normalize_candles(raw: object) -> list[dict[str, float]]:
    rows: list[dict[str, float]] = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict) or not isinstance(item.get("close"), (int, float)):
            continue
        close = float(item["close"])
        rows.append({
            "time": int(item.get("time", 0)),
            "open": float(item.get("open", close)),
            "high": float(item.get("high", close)),
            "low": float(item.get("low", close)),
            "close": close,
            "volume": float(item.get("volume", 0)),
        })
    return rows


def _returns(values: list[float]) -> list[float]:
    return [0.0 if values[index - 1] == 0 else values[index] / values[index - 1] - 1.0 for index in range(1, len(values))]


def _window_return(values: list[float], window: int) -> float:
    if len(values) <= window or values[-window - 1] == 0:
        return 0.0
    return values[-1] / values[-window - 1] - 1.0


def _std(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    return (sum((item - mean) ** 2 for item in values) / (len(values) - 1)) ** 0.5


def _volume_ratio(values: list[float]) -> float:
    if len(values) < 2:
        return 1.0
    base = values[-21:-1] if len(values) > 21 else values[:-1]
    avg = sum(base) / len(base) if base else 0.0
    return values[-1] / avg if avg else 1.0


def _clamp_window(raw: object, candle_count: int) -> int:
    try:
        requested = int(raw or 80)
    except (TypeError, ValueError):
        requested = 80
    return min(max(requested, 30), max(candle_count, 30), 260)


def _clamp_horizon(raw: object) -> int:
    try:
        requested = int(raw or 1)
    except (TypeError, ValueError):
        requested = 1
    return min(max(requested, 1), 20)


def _clamp_cost_bps(raw: object) -> float:
    try:
        requested = float(raw if raw is not None else 5)
    except (TypeError, ValueError):
        requested = 5.0
    return min(max(requested, 0.0), 100.0)


def _position_for_result(result: dict[str, Any]) -> int:
    trend = str(result.get("trend") or "")
    if trend == "bullish":
        return 1
    if trend == "bearish":
        return -1
    return 0


def _stable_id(payload: dict[str, Any]) -> str:
    import json

    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return sha256(encoded.encode("utf-8")).hexdigest()[:24]


def _runtime_requested(payload: dict[str, Any]) -> bool:
    context = payload.get("context") if isinstance(payload.get("context"), dict) else {}
    mode = str(context.get("dgwmRuntime") or context.get("runtime") or "").strip().lower()
    return mode in {"diagnostic", "real", "dgwm", "dgwm-diagnostic"}


def _runtime_exception(exc: Exception) -> dict[str, Any]:
    return {
        "runtime": "dgwm-quant-diagnostic-cli",
        "accepted": False,
        "exitCode": 1,
        "elapsedMs": 0,
        "payload": {
            "accepted": False,
            "failure": {
                "stage": "runtime_exception",
                "reasons": [str(exc) or exc.__class__.__name__],
                "diagnostics": {"exception_type": exc.__class__.__name__},
            },
        },
        "files": {},
    }


def _merge_runtime_diagnostic(analysis: dict[str, Any], diagnostic: dict[str, Any]) -> None:
    payload = diagnostic.get("payload") if isinstance(diagnostic.get("payload"), dict) else {}
    accepted = bool(diagnostic.get("accepted"))
    failure = payload.get("failure") if isinstance(payload.get("failure"), dict) else {}
    reasons = _runtime_reasons(failure, payload)
    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    analysis["meta"]["engine"] = "dgwm-quant-diagnostic-cli"
    analysis["runtimeDiagnostic"] = {
        "accepted": accepted,
        "exitCode": int(diagnostic.get("exitCode", 0)),
        "elapsedMs": int(diagnostic.get("elapsedMs", 0)),
        "metrics": metrics,
        "failure": failure,
        "universe": diagnostic.get("universe", {}),
        "files": diagnostic.get("files", {}),
    }
    if accepted:
        analysis["summary"] += " DGWM 真实 diagnostic runtime 已通过当前样本验证。"
        return
    analysis["tradePermission"] = {
        "allowed": False,
        "mode": "manual_review",
        "reasons": [f"dgwm:{reason}" for reason in reasons],
        "diagnostics": dict(analysis.get("tradePermission", {}).get("diagnostics", {})) | {
            "dgwmExitCode": float(diagnostic.get("exitCode", 0)),
            "dgwmElapsedMs": float(diagnostic.get("elapsedMs", 0)),
        },
    }
    analysis["summary"] += f" DGWM 真实 diagnostic runtime 已运行但未放行：{', '.join(reasons)}。"


def _runtime_reasons(failure: dict[str, Any], payload: dict[str, Any]) -> list[str]:
    raw = failure.get("reasons", ())
    reasons = [str(item) for item in raw if str(item)] if isinstance(raw, (list, tuple)) else [str(raw)]
    reasons = [reason for reason in reasons if reason]
    if reasons:
        return reasons

    manifest = payload.get("manifest") if isinstance(payload.get("manifest"), dict) else {}
    codes = manifest.get("rejection_codes") if isinstance(manifest, dict) else None
    if isinstance(codes, (list, tuple)):
        reasons.extend(str(code) for code in codes if str(code))

    metrics = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    if isinstance(metrics, dict):
        if float(metrics.get("strategy_positive_return_confirmed", 1.0) or 0.0) <= 0.0:
            reasons.append("strategy_positive_return_not_confirmed")
        weekly_lcb = metrics.get("weekly_return_lcb")
        if isinstance(weekly_lcb, (int, float)) and float(weekly_lcb) < 0.0:
            reasons.append("weekly_return_lcb_below_zero")
        certificates = metrics.get("certificates") if isinstance(metrics.get("certificates"), dict) else {}
        quarantine = certificates.get("quarantine") if isinstance(certificates.get("quarantine"), dict) else {}
        if quarantine and quarantine.get("current_release_eligible") is False:
            reasons.append("quarantine_current_release_ineligible")

    return list(dict.fromkeys(reasons)) or ["dgwm_runtime_rejected"]


__all__ = ("DgwmAdapter", "DgwmAdapterConfig")




