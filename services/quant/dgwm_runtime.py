from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess
import tempfile
import time
from typing import Any


@dataclass(frozen=True, slots=True)
class DgwmRuntimeConfig:
    root: Path
    timeout_seconds: int = 120

    @property
    def python(self) -> Path:
        win_python = self.root / ".venv" / "Scripts" / "python.exe"
        nix_python = self.root / ".venv" / "bin" / "python"
        return win_python if win_python.exists() else nix_python


class DgwmRuntime:
    """Subprocess bridge to the DGWM quant CLI runtime."""

    def __init__(self, config: DgwmRuntimeConfig) -> None:
        self.config = config

    def health(self) -> dict[str, Any]:
        python = self.config.python
        return {
            "python": str(python),
            "pythonExists": python.exists(),
            "registryImportable": self.can_import_registry(),
        }

    def can_import_registry(self) -> bool:
        python = self.config.python
        if not python.exists():
            return False
        try:
            result = subprocess.run(
                [str(python), "-c", "import extensions.tasks.quant.registry"],
                cwd=str(self.config.root),
                capture_output=True,
                text=True,
                timeout=20,
                check=False,
            )
        except Exception:
            return False
        return result.returncode == 0

    def run_diagnostic(self, payload: dict[str, Any], candles: list[dict[str, float]]) -> dict[str, Any]:
        if len(candles) < 30:
            raise ValueError("DGWM diagnostic runtime requires at least 30 candles")
        with tempfile.TemporaryDirectory(prefix="msir-dgwm-runtime-") as tmp_name:
            tmp = Path(tmp_name)
            csv_path = tmp / "bars.csv"
            request_path = tmp / "request.json"
            output_dir = tmp / "out"
            _write_bars_csv(csv_path, str(payload.get("symbol") or "UNKNOWN"), candles)
            request_path.write_text(
                json.dumps(_request_payload(payload, candles, csv_path), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            started = time.perf_counter()
            result = subprocess.run(
                [
                    str(self.config.python),
                    "-m",
                    "cli.quant",
                    "quant-diagnostic",
                    "--request",
                    str(request_path),
                    "--output-dir",
                    str(output_dir),
                ],
                cwd=str(self.config.root),
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds,
                check=False,
            )
            return _read_runtime_output(output_dir, result, int((time.perf_counter() - started) * 1000))


def _write_bars_csv(path: Path, symbol: str, candles: list[dict[str, float]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=("timestamp", "symbol", "open", "high", "low", "close", "adjusted_close", "volume"),
        )
        writer.writeheader()
        for candle in candles:
            close = float(candle["close"])
            writer.writerow({
                "timestamp": _timestamp(candle),
                "symbol": symbol,
                "open": float(candle.get("open", close)),
                "high": float(candle.get("high", close)),
                "low": float(candle.get("low", close)),
                "close": close,
                "adjusted_close": close,
                "volume": float(candle.get("volume", 0.0)),
            })


def _request_payload(payload: dict[str, Any], candles: list[dict[str, float]], csv_path: Path) -> dict[str, Any]:
    context = payload.get("context") if isinstance(payload.get("context"), dict) else {}
    return {
        "symbols": [str(payload.get("symbol") or "UNKNOWN")],
        "start": _timestamp(candles[0]),
        "end": _timestamp(candles[-1]),
        "market": {"source": f"file:{csv_path}", "interval": _dgwm_interval(str(payload.get("interval") or "1D"))},
        "world": {
            "horizon": int(context.get("horizon") or 1),
            "max_epochs": int(context.get("maxEpochs") or 1),
            "history_size": int(context.get("historySize") or 3),
            "max_profile_rank": int(context.get("maxProfileRank") or 32),
        },
        "control": {
            "initial_nav": float(context.get("initialNav") or 100000.0),
            "max_candidate_actions": int(context.get("maxCandidateActions") or 3),
            "max_turnover": float(context.get("maxTurnover") or 0.5),
            "multiscale": {"horizons": [int(context.get("horizon") or 1)]},
        },
        "risk": {"max_drawdown": 1.0, "max_cvar": 1.0, "max_gross": 1.0},
        "validation": {"start": _timestamp(candles[max(0, len(candles) // 2)]), "end": _timestamp(candles[-1])},
    }


def _read_runtime_output(output_dir: Path, result: subprocess.CompletedProcess[str], elapsed_ms: int) -> dict[str, Any]:
    success_path = output_dir / "quant_diagnostic_result.json"
    failure_path = output_dir / "quant_diagnostic_failure.json"
    payload = _read_json(success_path) if success_path.exists() else _read_json(failure_path)
    return {
        "runtime": "dgwm-quant-diagnostic-cli",
        "accepted": bool(payload.get("accepted", False)),
        "exitCode": int(result.returncode),
        "elapsedMs": elapsed_ms,
        "payload": payload,
        "files": {path.name: str(path) for path in output_dir.glob("*.json*")},
        "stdout": result.stdout[-2000:],
        "stderr": result.stderr[-2000:],
    }


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"accepted": False, "failure": {"reasons": ("missing_runtime_output",)}}
    value = json.loads(path.read_text(encoding="utf-8"))
    return value if isinstance(value, dict) else {"accepted": False, "raw": value}


def _timestamp(candle: dict[str, float]) -> str:
    raw = int(candle.get("time", 0))
    if raw <= 0:
        return datetime.now(timezone.utc).isoformat()
    return datetime.fromtimestamp(raw, timezone.utc).isoformat()


def _dgwm_interval(interval: str) -> str:
    return "1d" if interval.upper() in {"1D", "D", "DAY"} else interval.lower()


__all__ = ("DgwmRuntime", "DgwmRuntimeConfig")
