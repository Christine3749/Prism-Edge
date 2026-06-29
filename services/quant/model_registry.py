from __future__ import annotations

"""Read-only registry for local GSYEN quant model candidates."""

from dataclasses import dataclass
from datetime import datetime, timezone
import os
from pathlib import Path
import subprocess
import sys
import tomllib
from typing import Any


DEFAULT_MODEL_ROOT = Path(r"C:\Users\Ethan\Desktop\01-Projects\GSYEN-Model")
DEFAULT_DGWM_ROOT = DEFAULT_MODEL_ROOT / "dgwm"


@dataclass(frozen=True, slots=True)
class ModelSpec:
    id: str
    name: str
    kind: str
    role: str
    root_env: str
    default_root: Path
    files: dict[str, str]
    capabilities: tuple[str, ...]
    import_module: str | None = None
    notes: tuple[str, ...] = ()


def build_model_registry() -> dict[str, Any]:
    """Return a fast, read-only snapshot of local model integration targets."""

    specs = _model_specs()
    models = [_inspect_model(spec) for spec in specs]
    default_model_id = os.getenv("PRISM_QUANT_DEFAULT_MODEL_ID", "dgwm-main-local-gpu").strip()
    if not any(model["id"] == default_model_id for model in models):
        default_model_id = models[0]["id"] if models else ""
    return {
        "schema": "msir.prism.quant-model-registry.v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "baseRoot": str(_base_root()),
        "defaultModelId": default_model_id,
        "models": models,
    }


def _model_specs() -> tuple[ModelSpec, ...]:
    base = _base_root()
    return (
        ModelSpec(
            id="dgwm-main-local-gpu",
            name="DGWM Main Local GPU",
            kind="dgwm",
            role="primary",
            root_env="DGWM_ROOT",
            default_root=base / "dgwm",
            files={
                "cli_quant": "cli/quant.py",
                "quant_registry": "extensions/tasks/quant/registry.py",
                "release_service": "extensions/domains/quant/release/service.py",
                "trade_permission": "extensions/domains/quant/risk/trade_permission.py",
                "bellman_solver": "extensions/domains/quant/planning/bellman/solver.py",
            },
            capabilities=(
                "state_compile",
                "decision",
                "diagnostic",
                "backtest",
                "trade_permission",
                "bellman",
            ),
            import_module="extensions.tasks.quant.registry",
            notes=("Current Prism runtime adapter target.",),
        ),
        ModelSpec(
            id="dgwm-m-reference",
            name="DGWM-M Reference",
            kind="dgwm",
            role="reference",
            root_env="DGWM_M_ROOT",
            default_root=base / "dgwm-M",
            files={
                "cli_quant": "cli/quant.py",
                "quant_registry": "extensions/tasks/quant/registry.py",
                "release_service": "extensions/domains/quant/release/service.py",
                "trade_permission": "extensions/domains/quant/risk/trade_permission.py",
            },
            capabilities=("diagnostic", "compatibility_probe", "reference_backtest"),
            import_module="extensions.tasks.quant.registry",
            notes=("Historical branch for compatibility checks and comparison.",),
        ),
        ModelSpec(
            id="gsyen-pytorch-head",
            name="GSYEN PyTorch Head",
            kind="pytorch_head",
            role="factor_head",
            root_env="GSYEN_PYTORCH_ROOT",
            default_root=base / "Gsyen-pytorch",
            files={
                "package": "gsyen_pytorch/__init__.py",
                "engine": "gsyen_pytorch/engine.py",
                "runtime": "gsyen_pytorch/runtime.py",
                "contracts": "gsyen_pytorch/contracts.py",
                "pyproject": "pyproject.toml",
            },
            capabilities=("factor_scoring", "management_priority", "lightweight_inference"),
            import_module="gsyen_pytorch",
            notes=("Small PyTorch/NumPy head; good candidate for Prism-side factor scoring.",),
        ),
        ModelSpec(
            id="mini-quant-baseline",
            name="Mini Quant Baseline",
            kind="baseline",
            role="educational_baseline",
            root_env="MINI_QUANT_ROOT",
            default_root=base / "mini-quant",
            files={
                "runner": "run.py",
                "backtest": "backtest.py",
                "factors": "factors.py",
                "metrics": "metrics.py",
                "sample_data": "data/csi500_bars.csv",
            },
            capabilities=("baseline_backtest", "factor_demo", "sanity_check"),
            import_module=None,
            notes=("Simple reference baseline, useful for smoke tests and UI comparison.",),
        ),
    )


def _inspect_model(spec: ModelSpec) -> dict[str, Any]:
    root = _env_path(spec.root_env, spec.default_root)
    files = {name: (root / rel_path).exists() for name, rel_path in spec.files.items()}
    python = _python_for(spec, root)
    import_result = _check_import(spec, root, python)
    missing = [name for name, exists in files.items() if not exists]
    exists = root.exists()
    importable = import_result["ok"] if spec.import_module else None
    status = _status(exists, missing, importable)
    return {
        "id": spec.id,
        "name": spec.name,
        "kind": spec.kind,
        "role": spec.role,
        "root": str(root),
        "exists": exists,
        "status": status,
        "version": _version(root),
        "gitCommit": _git_commit(root),
        "dirty": _git_dirty(root),
        "python": str(python) if python else "",
        "pythonExists": bool(python and python.exists()),
        "importModule": spec.import_module or "",
        "importable": importable,
        "importError": import_result["error"],
        "files": files,
        "capabilities": list(spec.capabilities),
        "notes": _notes(spec, status, missing, import_result),
    }


def _base_root() -> Path:
    return _env_path("GSYEN_MODEL_ROOT", DEFAULT_MODEL_ROOT)


def _env_path(name: str, fallback: Path) -> Path:
    raw = os.getenv(name, "").strip()
    if not raw:
        return fallback
    return Path(os.path.expandvars(raw)).expanduser()


def _python_for(spec: ModelSpec, root: Path) -> Path | None:
    own_python = _venv_python(root)
    if own_python.exists():
        return own_python
    if spec.kind == "pytorch_head":
        dgwm_python = _venv_python(_env_path("DGWM_ROOT", DEFAULT_DGWM_ROOT))
        if dgwm_python.exists():
            return dgwm_python
    return own_python


def _venv_python(root: Path) -> Path:
    win_python = root / ".venv" / "Scripts" / "python.exe"
    if win_python.exists():
        return win_python
    return root / ".venv" / "bin" / "python"


def _check_import(spec: ModelSpec, root: Path, python: Path | None) -> dict[str, Any]:
    if not spec.import_module:
        return {"ok": None, "error": ""}
    if not python or not python.exists():
        return {"ok": False, "error": "python_not_found"}
    env = os.environ.copy()
    env["PYTHONPATH"] = str(root)
    try:
        result = subprocess.run(
            [str(python), "-c", f"import {spec.import_module}"],
            cwd=str(root),
            env=env,
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except Exception as exc:
        return {"ok": False, "error": exc.__class__.__name__}
    if result.returncode == 0:
        return {"ok": True, "error": ""}
    error = (result.stderr or result.stdout or f"exit_{result.returncode}").strip().splitlines()
    return {"ok": False, "error": error[-1][-240:] if error else f"exit_{result.returncode}"}


def _status(exists: bool, missing: list[str], importable: bool | None) -> str:
    if not exists:
        return "missing"
    if missing:
        return "degraded"
    if importable is False:
        return "degraded"
    return "ready"


def _notes(spec: ModelSpec, status: str, missing: list[str], import_result: dict[str, Any]) -> list[str]:
    notes = list(spec.notes)
    if status == "missing":
        notes.append("Model root is missing on this machine.")
    if missing:
        notes.append(f"Missing files: {', '.join(missing)}.")
    if import_result["ok"] is False:
        notes.append(f"Import check failed: {import_result['error']}.")
    return notes


def _version(root: Path) -> str:
    pyproject = root / "pyproject.toml"
    if not pyproject.exists():
        return ""
    try:
        data = tomllib.loads(pyproject.read_text(encoding="utf-8"))
    except Exception:
        return ""
    project = data.get("project") if isinstance(data, dict) else {}
    version = project.get("version") if isinstance(project, dict) else ""
    return str(version or "")


def _git_commit(root: Path) -> str:
    result = _git(root, "rev-parse", "--short", "HEAD")
    return result.strip()


def _git_dirty(root: Path) -> bool:
    result = _git(root, "status", "--short")
    return bool(result.strip())


def _git(root: Path, *args: str) -> str:
    if not root.exists():
        return ""
    try:
        result = subprocess.run(
            ["git", "-C", str(root), *args],
            capture_output=True,
            text=True,
            timeout=8,
            check=False,
        )
    except Exception:
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout


if __name__ == "__main__":
    import json

    json.dump(build_model_registry(), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


__all__ = ("build_model_registry",)
