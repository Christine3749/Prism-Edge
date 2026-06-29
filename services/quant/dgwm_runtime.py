from __future__ import annotations

import csv
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
import time
from typing import Any, Mapping


MIN_RUNTIME_BARS = 180
MIN_RUNTIME_SYMBOLS = 6


@dataclass(frozen=True, slots=True)
class DgwmRuntimeConfig:
    root: Path
    timeout_seconds: int = 120

    @property
    def python(self) -> Path:
        win_python = self.root / ".venv" / "Scripts" / "python.exe"
        nix_python = self.root / ".venv" / "bin" / "python"
        return win_python if win_python.exists() else nix_python


@dataclass(frozen=True, slots=True)
class RuntimeUniverse:
    primary_symbol: str
    symbols: tuple[str, ...]
    rows_by_symbol: Mapping[str, tuple[dict[str, float], ...]]
    row_count: int
    target_bars: int
    source: str
    synthetic_symbols: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "primarySymbol": self.primary_symbol,
            "symbols": list(self.symbols),
            "rowCount": int(self.row_count),
            "targetBars": int(self.target_bars),
            "source": self.source,
            "syntheticSymbols": list(self.synthetic_symbols),
            "realSymbols": [symbol for symbol in self.symbols if symbol not in set(self.synthetic_symbols)],
        }


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
        universe = _build_runtime_universe(payload, candles)
        if universe.row_count < 30:
            raise ValueError("DGWM diagnostic runtime requires at least 30 aligned bars")
        temp_kwargs = _runtime_temp_kwargs()
        with tempfile.TemporaryDirectory(prefix="msir-dgwm-runtime-", **temp_kwargs) as tmp_name:
            tmp = Path(tmp_name)
            csv_path = tmp / "bars.csv"
            request_path = tmp / "request.json"
            output_dir = tmp / "out"
            _write_bars_csv(csv_path, universe)
            request_path.write_text(
                json.dumps(_request_payload(payload, universe, csv_path), ensure_ascii=False, indent=2),
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
            return _read_runtime_output(output_dir, result, int((time.perf_counter() - started) * 1000), universe)


def _build_runtime_universe(payload: dict[str, Any], candles: list[dict[str, float]]) -> RuntimeUniverse:
    context = _context(payload)
    primary_symbol = _clean_symbol(str(payload.get("symbol") or "UNKNOWN"))
    target_bars = _clamp_int(context.get("dgwmUniverseTargetBars") or context.get("targetBars"), MIN_RUNTIME_BARS, 30, 260)
    min_symbols = _clamp_int(context.get("dgwmMinSymbols") or context.get("minUniverseSymbols"), MIN_RUNTIME_SYMBOLS, 2, 10)
    base_rows = _tail_rows(_normalize_runtime_candles(candles), target_bars)
    if len(base_rows) < 30:
        raise ValueError("DGWM diagnostic runtime requires at least 30 primary candles")

    times = tuple(int(row["time"]) for row in base_rows)
    rows_by_symbol: dict[str, tuple[dict[str, float], ...]] = {primary_symbol: base_rows}
    raw_by_symbol = payload.get("candlesBySymbol") if isinstance(payload.get("candlesBySymbol"), dict) else {}

    for symbol in _requested_symbols(payload, context, primary_symbol, raw_by_symbol):
        if symbol == primary_symbol:
            continue
        raw_rows = raw_by_symbol.get(symbol) if isinstance(raw_by_symbol, dict) else None
        projected = _project_to_times(_normalize_runtime_candles(raw_rows), times)
        if projected:
            rows_by_symbol[symbol] = projected

    if len(rows_by_symbol) < min_symbols:
        rows_by_symbol = {primary_symbol: base_rows}

    synthetic_symbols: list[str] = []
    variant_index = 0
    while len(rows_by_symbol) < min_symbols:
        synthetic_symbol = _synthetic_symbol(primary_symbol, variant_index)
        if synthetic_symbol not in rows_by_symbol:
            rows_by_symbol[synthetic_symbol] = _synthetic_rows(base_rows, variant_index)
            synthetic_symbols.append(synthetic_symbol)
        variant_index += 1

    ordered_symbols = tuple(rows_by_symbol.keys())
    if synthetic_symbols and len(synthetic_symbols) == len(ordered_symbols) - 1:
        source = "synthetic-shadow"
    elif synthetic_symbols:
        source = "market-gateway+synthetic-shadow"
    else:
        source = "market-gateway"
    return RuntimeUniverse(
        primary_symbol=primary_symbol,
        symbols=ordered_symbols,
        rows_by_symbol=rows_by_symbol,
        row_count=len(base_rows),
        target_bars=target_bars,
        source=source,
        synthetic_symbols=tuple(synthetic_symbols),
    )


def _requested_symbols(
    payload: dict[str, Any],
    context: dict[str, Any],
    primary_symbol: str,
    raw_by_symbol: object,
) -> tuple[str, ...]:
    symbols: list[str] = [primary_symbol]
    for raw in (payload.get("symbols"), context.get("dgwmUniverse"), context.get("symbols")):
        symbols.extend(_iter_symbol_values(raw))
    if isinstance(raw_by_symbol, dict):
        symbols.extend(str(symbol) for symbol in raw_by_symbol.keys())
    cleaned = [_clean_symbol(symbol) for symbol in symbols]
    return tuple(dict.fromkeys(symbol for symbol in cleaned if symbol))


def _iter_symbol_values(raw: object) -> list[str]:
    if isinstance(raw, str):
        return [item.strip() for item in raw.split(",") if item.strip()]
    if isinstance(raw, (list, tuple)):
        return [str(item).strip() for item in raw if str(item).strip()]
    return []


def _normalize_runtime_candles(raw: object) -> tuple[dict[str, float], ...]:
    rows: list[dict[str, float]] = []
    for item in raw if isinstance(raw, list) else []:
        if not isinstance(item, dict) or not isinstance(item.get("close"), (int, float)):
            continue
        close = float(item["close"])
        if not math.isfinite(close) or close <= 0.0:
            continue
        open_value = _finite_float(item.get("open"), close)
        high = _finite_float(item.get("high"), max(open_value, close))
        low = _finite_float(item.get("low"), min(open_value, close))
        high = max(high, open_value, close)
        low = max(min(low, open_value, close), 1.0e-9)
        rows.append({
            "time": int(_finite_float(item.get("time"), 0.0)),
            "open": open_value,
            "high": high,
            "low": low,
            "close": close,
            "volume": max(_finite_float(item.get("volume"), 0.0), 1.0),
        })
    deduped = {int(row["time"]): row for row in rows if int(row["time"]) > 0}
    return tuple(deduped[key] for key in sorted(deduped))


def _tail_rows(rows: tuple[dict[str, float], ...], target_bars: int) -> tuple[dict[str, float], ...]:
    return tuple(rows[-int(target_bars):])


def _project_to_times(rows: tuple[dict[str, float], ...], times: tuple[int, ...]) -> tuple[dict[str, float], ...]:
    if not rows or not times:
        return ()
    by_time = {int(row["time"]): row for row in rows}
    if any(time_value not in by_time for time_value in times):
        return ()
    return tuple(by_time[time_value] for time_value in times)


def _synthetic_rows(base_rows: tuple[dict[str, float], ...], variant_index: int) -> tuple[dict[str, float], ...]:
    rows: list[dict[str, float]] = []
    length = max(len(base_rows) - 1, 1)
    drift = 0.0005 * (variant_index + 1)
    amplitude = 0.006 + 0.002 * (variant_index % 4)
    phase = 1.7 * (variant_index + 1)
    base_offset = 0.035 * (variant_index + 1)
    for index, row in enumerate(base_rows):
        progress = index / length
        wave = math.sin(index / (5.0 + variant_index) + phase) * amplitude
        factor = max(0.2, 1.0 + base_offset + drift * index + wave)
        open_value = float(row["open"]) * factor
        close = float(row["close"]) * factor
        high = max(float(row["high"]) * factor * (1.002 + 0.0005 * variant_index), open_value, close)
        low = max(min(float(row["low"]) * factor * (0.998 - 0.0003 * variant_index), open_value, close), 1.0e-9)
        rows.append({
            "time": row["time"],
            "open": open_value,
            "high": high,
            "low": low,
            "close": close,
            "volume": max(float(row.get("volume", 1.0)) * (1.0 + 0.18 * (variant_index + 1) + 0.03 * math.cos(index / 7.0)), 1.0),
        })
    return tuple(rows)


def _synthetic_symbol(primary_symbol: str, variant_index: int) -> str:
    labels = ("MOM", "LOWVOL", "VALUE", "QUALITY", "REV", "CARRY", "HEDGE", "BETA", "ALPHA")
    base = "".join(char for char in primary_symbol.upper() if char.isalnum()) or "DGWM"
    return f"{base}.{labels[variant_index % len(labels)]}"


def _write_bars_csv(path: Path, universe: RuntimeUniverse) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=("timestamp", "symbol", "open", "high", "low", "close", "adjusted_close", "volume"),
        )
        writer.writeheader()
        for index in range(universe.row_count):
            for symbol in universe.symbols:
                candle = universe.rows_by_symbol[symbol][index]
                close = float(candle["close"])
                writer.writerow({
                    "timestamp": _timestamp(candle),
                    "symbol": symbol,
                    "open": float(candle.get("open", close)),
                    "high": float(candle.get("high", close)),
                    "low": float(candle.get("low", close)),
                    "close": close,
                    "adjusted_close": close,
                    "volume": max(float(candle.get("volume", 0.0)), 1.0),
                })


def _request_payload(payload: dict[str, Any], universe: RuntimeUniverse, csv_path: Path) -> dict[str, Any]:
    context = _context(payload)
    rows = universe.rows_by_symbol[universe.primary_symbol]
    horizon = _clamp_int(context.get("horizon"), 1, 1, 260)
    return {
        "symbols": list(universe.symbols),
        "start": _timestamp(rows[0]),
        "end": _timestamp(rows[-1]),
        "market": {"source": f"file:{csv_path}", "interval": _dgwm_interval(str(payload.get("interval") or "1D"))},
        "world": {
            "horizon": horizon,
            "max_epochs": _clamp_int(context.get("maxEpochs"), 1, 1, 20),
            "history_size": _clamp_int(context.get("historySize"), 5, 2, 60),
            "max_profile_rank": _clamp_int(context.get("maxProfileRank"), 64, 8, 512),
        },
        "control": {
            "initial_nav": _finite_float(context.get("initialNav"), 100000.0),
            "max_candidate_actions": _clamp_int(context.get("maxCandidateActions"), 7, 2, 64),
            "max_turnover": _finite_float(context.get("maxTurnover"), 0.7),
            "max_position": _finite_float(context.get("maxPosition"), 0.35),
            "multiscale": {"horizons": [horizon]},
        },
        "risk": {"max_drawdown": 1.0, "max_cvar": 1.0, "max_gross": 1.0},
        "validation": {"start": _timestamp(rows[max(0, len(rows) // 2)]), "end": _timestamp(rows[-1])},
    }


def _read_runtime_output(
    output_dir: Path,
    result: subprocess.CompletedProcess[str],
    elapsed_ms: int,
    universe: RuntimeUniverse,
) -> dict[str, Any]:
    success_path = output_dir / "quant_diagnostic_result.json"
    failure_path = output_dir / "quant_diagnostic_failure.json"
    payload = _read_json(success_path) if success_path.exists() else _read_json(failure_path)
    return {
        "runtime": "dgwm-quant-diagnostic-cli",
        "accepted": bool(payload.get("accepted", False)),
        "exitCode": int(result.returncode),
        "elapsedMs": elapsed_ms,
        "payload": payload,
        "universe": universe.to_dict(),
        "files": {path.name: str(path) for path in output_dir.glob("*.json*")},
        "stdout": result.stdout[-2000:],
        "stderr": result.stderr[-2000:],
    }


def _read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"accepted": False, "failure": {"reasons": ("missing_runtime_output",)}}
    value = json.loads(path.read_text(encoding="utf-8"))
    return value if isinstance(value, dict) else {"accepted": False, "raw": value}


def _context(payload: dict[str, Any]) -> dict[str, Any]:
    value = payload.get("context")
    return dict(value) if isinstance(value, dict) else {}


def _timestamp(candle: dict[str, float]) -> str:
    raw = int(candle.get("time", 0))
    if raw <= 0:
        return datetime.now(timezone.utc).isoformat()
    return datetime.fromtimestamp(raw, timezone.utc).isoformat()


def _dgwm_interval(interval: str) -> str:
    return "1d" if interval.upper() in {"1D", "D", "DAY"} else interval.lower()


def _clean_symbol(value: str) -> str:
    return str(value).strip().upper().replace("/", "")


def _finite_float(value: object, default: float) -> float:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return float(default)
    return result if math.isfinite(result) else float(default)


def _clamp_int(value: object, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = int(default)
    return max(int(minimum), min(int(maximum), parsed))


def _runtime_temp_kwargs() -> dict[str, str]:
    configured = os.getenv("DGWM_RUNTIME_TMPDIR", "").strip()
    candidates = [configured] if configured else []
    candidates.append(r"C:\tmp")
    for candidate in candidates:
        if not candidate:
            continue
        path = Path(candidate)
        if path.exists() and path.is_dir():
            return {"dir": str(path)}
    return {}


__all__ = ("DgwmRuntime", "DgwmRuntimeConfig")
