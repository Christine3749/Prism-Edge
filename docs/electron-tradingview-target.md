# Prism-Edge Electron Target

Prism-Edge desktop should benchmark itself against TradingView as a professional workstation shell, not as a separate product from the web app.

## Non-Negotiable Platform Goals

- One product core: the Electron app loads the same Prism-Edge web experience.
- Desktop shell only enhances workspace behavior: windows, tabs, multi-monitor, persistence, and controlled Chromium rendering.
- Web remains the source of truth for I-VI platform modes.
- Electron is the only desktop shell for Prism-Edge.

## TradingView Behaviors To Preserve As Targets

- Multi-chart workspace layouts with stable panel ratios.
- Right-side watchlist and asset detail rail.
- Left drawing/tool rail that does not crowd the chart.
- Dense but readable financial tables.
- Indicator and strategy library modal with search, categories, favorites, and community/script concepts.
- Published chart and idea pages that can embed analysis without breaking chart readability.
- Symbol syncing between tabs/windows.
- Synchronized workspace crosshairs across screens.
- Multi-window and multi-monitor workflows.
- Workspace restore after restart.
- Native installer path for Windows, including MSIX as a future packaging target.

## Performance Budgets

- Desktop cold open should feel immediate enough for daily use.
- Main chart must remain visually dominant on 13.3, 14, and 27 inch displays.
- UI should not rely on browser zoom to become usable.
- No horizontal page overflow in standard laptop layouts.
- Mode rail, chart, side panels, and workbench must degrade by priority, not by random compression.
- Modal overlays must not cover trading-critical data unless the task intentionally shifts focus.

## Electron Shell Scope

Phase 1:
- Secure Chromium shell.
- Load existing localhost web app in development.
- Load built `dist` app in production.
- Native app menu.
- Safe external-link handling.
- Persistent Chromium session.

Phase 2:
- Multi-window support.
- Workspace restore.
- Symbol and mode sync between windows.
- Desktop shortcuts.

Phase 3:
- MSIX/NSIS packaging.
- Auto-update evaluation.
- Crosshair sync and multi-monitor workflows.
- Local performance telemetry.
