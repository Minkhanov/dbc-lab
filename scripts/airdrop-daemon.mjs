// Polite devnet airdrop poller: one request per 7 minutes until the test wallet holds >= 1 SOL (or 8 hours pass).
// Public key only (no secrets). Log: keys/airdrop-daemon.log
import fs from "node:fs";
import path from "node:path";
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
while (Date.now() < deadline) {
  n++;
  try {
    const b = (await rpc("getBalance", [PUB])).result?.value ?? 0;
    out(`try ${n} balance=${b}`);
    if (b >= 1_000_000_000) { out("enough, stop"); break; }
    const a = await rpc("requestAirdrop", [PUB, 2_000_000_000]);
    out(`airdrop -> ${JSON.stringify(a).slice(0, 160)}`);
    if (a.result) { await sleep(20000); continue; }
  } catch (e) { out(`error ${e}`); }
  await sleep(7 * 60 * 1000);
}
