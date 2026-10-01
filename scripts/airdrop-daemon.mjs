// Polite devnet airdrop poller. One request per 7 minutes until the throw-away wallet holds >= 1 SOL (or 8 hours pass).
// When funded, it runs the whole devnet proof once (src/devnet/run.ts all, resumable) and renders DEVNET-PROOF.md.
// Only the PUBLIC key is used here. Logs: keys/airdrop-daemon.log, keys/devnet-auto-run.log
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PUB = "EaF7jiLSjxvKNr76VmPM8aWucP1j5i8A6eM6WUjX3LRE";
const RPC = "https://api.devnet.solana.com";
const log = path.resolve("keys", "airdrop-daemon.log");
const out = (s) => fs.appendFileSync(log, `${new Date().toISOString()} ${s}\n`);
const rpc = async (method, params) => {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return r.json();
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = Date.now() + 8 * 3600 * 1000;
let n = 0;
let funded = false;
while (Date.now() < deadline && !funded) {
  n++;
  try {
    const b = (await rpc("getBalance", [PUB])).result?.value ?? 0;
    out(`try ${n} balance=${b}`);
    if (b >= 1_000_000_000) {
      funded = true;
      break;
    }
    const a = await rpc("requestAirdrop", [PUB, 2_000_000_000]);
    out(`airdrop -> ${JSON.stringify(a).slice(0, 160)}`);
    if (a.result) {
      await sleep(25000);
      continue;
    }
  } catch (e) {
    out(`error ${e}`);
  }
  await sleep(7 * 60 * 1000);
}

if (funded) {
  out("funded: running devnet proof (resumable)");
  const autoLog = fs.openSync(path.resolve("keys", "devnet-auto-run.log"), "a");
  const tsx = path.resolve("node_modules", "tsx", "dist", "cli.mjs");
  const run = spawnSync(process.execPath, [tsx, "src/devnet/run.ts", "all"], { stdio: ["ignore", autoLog, autoLog], timeout: 25 * 60 * 1000 });
  out(`runner exit code ${run.status}`);
  const render = spawnSync(process.execPath, [tsx, "scripts/render-proof.ts"], { stdio: ["ignore", autoLog, autoLog], timeout: 5 * 60 * 1000 });
  out(`render exit code ${render.status}`);
} else {
  out("gave up after 8 hours without a successful airdrop");
}
