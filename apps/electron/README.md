# Prism-Edge Electron

Electron is the professional desktop shell for Prism-Edge.

It keeps the existing web product as the source of truth and adds a controlled Chromium desktop runtime for workstation workflows.

## Commands

From the repository root:

```powershell
npm run electron
npm run electron:pack
npm run electron:dist
```

`npm run electron` expects the Prism-Edge web server to already be running at `http://localhost:3000`, or you can override it:

```powershell
$env:PRISM_ELECTRON_URL="http://localhost:3000"; npm run electron
```

Codex must not start the local dev server. Start the web server manually before opening the Electron shell.

## Production Loading

Packaged builds load `https://msirprism.com` by default so authentication,
market data, analysis, and WebSocket requests use the same production origin as
the web application.

`PRISM_ELECTRON_URL` remains available for controlled staging or local testing.
The bundled `dist` output and internal `prism://app/` protocol are retained as
an offline shell option, but that mode requires an explicit API origin.
