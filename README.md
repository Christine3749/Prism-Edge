# MSIR Prism｜棱镜先生

MSIR Prism is a cross-platform market analysis terminal. The frontend owns charting and workspace UX; the backend owns market analysis, quant adapters, and future backtesting.

## Structure

```text
msir-prism/
  apps/
    web/                 # React/Vite frontend
    desktop/             # Tauri shell
    android/             # Capacitor shell
  services/
    api/                 # Python FastAPI backend
    quant/               # Quant model adapter layer
  packages/
    shared/              # Shared TS contracts, symbols, intervals, mock data
    ui/                  # MSIR Prism frontend UI modules
  data/
    samples/             # Sample candles for API/model testing
  docs/
    api-contract.md
    model-contract.md
```

## Run Locally

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
python -m pip install -r services/api/requirements.txt
```

Start FastAPI:

```bash
npm run dev:api
```

Start the web gateway in another terminal:

```bash
npm run dev
```

Open `http://localhost:3000`.

FastAPI docs are available at `http://localhost:8000/docs`.

## Verification

```bash
npm run lint
npm run build
npm run api:check
```

The frontend calls `POST /api/analysis/run`. During development, the Node web gateway forwards that call to FastAPI through `API_BASE_URL` and falls back to a local same-shape response if the backend is not running.

Live Binance calls are disabled by default so the first development phase stays on controlled sample/simulated data. Set `VITE_ENABLE_LIVE_BINANCE=true` only when you are ready to test real market data.
