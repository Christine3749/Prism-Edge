import { computeLocalBacktest } from "../server/backtestFallback";
import { computeLocalAnalysis } from "../server/analysisFallback";

const pct = (x: number) => `${(x * 100).toFixed(2)}%`;

async function main() {
  const symbol = "002594.SZ";
  const interval = "5m";
  const url = `http://localhost:3111/api/market/klines?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=600`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`klines ${resp.status}: ${await resp.text()}`);
  const payload: any = await resp.json();
  const candles = payload.candles || [];
  console.log(`Fetched ${candles.length} candles for ${symbol} ${interval} via "${payload.source || "?"}"`);
  if (candles.length < 120) throw new Error(`Only ${candles.length} candles — need >=120.`);

  const window = 80;
  const body = { symbol, interval, candles, window, horizon: 1, costBps: 5 };

  // --- OLD: self-graded (reproduce the previous logic: compound the model's own netReward) ---
  let equityOld = 1;
  for (let i = window; i <= candles.length; i += 1) {
    const slice = candles.slice(Math.max(0, i - window), i);
    const r = computeLocalAnalysis({ ...body, candles: slice });
    const reward = Number(r.netReward.mean || 0);
    const allowed = Boolean(r.tradePermission.allowed);
    equityOld *= 1 + (allowed ? reward : 0);
  }

  // --- NEW: realized forward returns ---
  const honest = computeLocalBacktest(body);

  console.log("\n========== OLD  (self-graded — marks its own homework) ==========");
  console.log(`  cumulativeReturn : ${pct(equityOld - 1)}   <-- looks like alpha, proves NOTHING`);
  console.log("  (it never once looked at the next candle's price)");

  console.log("\n========== NEW  (realized forward returns vs reality) ==========");
  console.log(`  cumulativeReturn : ${pct(honest.cumulativeReturn)}   (strategy, after ${honest.costBps}bps cost)`);
  console.log(`  buyHoldReturn    : ${pct(honest.buyHoldReturn)}   (just holding the stock)`);
  console.log(`  excessReturn     : ${pct(honest.excessReturn)}   <-- the only number that matters`);
  console.log(`  winRate          : ${pct(honest.winRate)}`);
  console.log(`  maxDrawdown      : ${pct(honest.maxDrawdown)}`);
  console.log(`  trades           : ${honest.trades}`);
  console.log(`  activeBars/total : ${honest.activeBars}/${honest.sampleCount}  (exposure ${pct(honest.exposurePct)})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
