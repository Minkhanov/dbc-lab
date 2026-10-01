/**
 * Time-dimension conformance: catch REAL devnet pools whose fee scheduler is still decaying right now, and compare the
 * simulator with the deployed program at the program's own clock. New devnet pools appear every minute (hackathon traffic),
 * many with 60 s schedules, so we poll: load pools, pick the ones still inside their schedule, simulate immediately, repeat.
 *
 * Usage: tsx scripts/conformance-timing.ts [targetActive=10] [maxRounds=12]
 */
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { checkPool, client, conn, program, retry, sleep, summarize, type Cfg, type Rec } from "./lib/checkPool.js";

const TARGET = Number(process.argv[2] ?? 10);
const ROUNDS = Number(process.argv[3] ?? 12);
const records = new Map<string, Rec>();
const seen = new Set<string>();
const cfgCache = new Map<string, Cfg | null>();

for (let round = 1; round <= ROUNDS; round++) {
  const t0 = Math.floor(Date.now() / 1000);
  const pools = await retry("getPools", () => client.state.getPools());
  // newest timestamp-activated pools first
  const recent = pools
    .filter((p) => {
      const ap = Number(p.account.poolState.activationPoint.toString());
      return p.account.poolState.isMigrated === 0 && ap > 1_700_000_000 && ap <= t0 + 5 && t0 - ap < 6 * 3600;
    })
    .sort((a, b) => Number(b.account.poolState.activationPoint.toString()) - Number(a.account.poolState.activationPoint.toString()))
    .slice(0, 400);
  const need = [...new Set(recent.map((p) => p.account.poolState.config.toBase58()))].filter((k) => !cfgCache.has(k));
  for (let i = 0; i < need.length; i += 100) {
    const chunk = need.slice(i, i + 100).map((k) => new PublicKey(k));
    const infos = await retry("getMultipleAccountsInfo", () => conn.getMultipleAccountsInfo(chunk));
    infos.forEach((info, idx) => {
      let dec: Cfg | null = null;
      if (info) {
        try {
          dec = program.coder.accounts.decode("poolConfig", info.data);
        } catch {
          dec = null;
        }
      }
      cfgCache.set(chunk[idx]!.toBase58(), dec);
    });
  }
  const now = Math.floor(Date.now() / 1000);
  const live = recent.filter((p) => {
    const c = cfgCache.get(p.account.poolState.config.toBase58());
    if (!c || !new PublicKey(c.quoteMint).equals(NATIVE_MINT) || c.quoteTokenFlag !== 0) return false;
    if (c.activationType !== 1 || c.poolFees.baseFee.baseFeeMode > 1) return false;
    const bf = c.poolFees.baseFee;
    const freq = Number(bf.secondFactor.toString());
    const periods = Number(bf.firstFactor);
    if (!(freq > 0 && periods > 0)) return false;
    const elapsed = now - Number(p.account.poolState.activationPoint.toString());
    if (elapsed / freq >= periods - 0.2) return false; // about to end: skip
    const remaining = BigInt(c.migrationQuoteThreshold.toString()) - BigInt(p.account.poolState.quoteReserve.toString());
    return remaining > 5_000_000n && remaining < 300_000_000_000n && !seen.has(p.publicKey.toBase58());
  });
  console.log(`round ${round}/${ROUNDS}: ${recent.length} recent pools, ${live.length} with a still-decaying schedule`);
  for (const p of live) {
    seen.add(p.publicKey.toBase58());
    const c = cfgCache.get(p.account.poolState.config.toBase58())!;
    const remaining = BigInt(c.migrationQuoteThreshold.toString()) - BigInt(p.account.poolState.quoteReserve.toString());
    const mode: "exactIn" | "partialFill" = records.size % 4 === 3 ? "partialFill" : "exactIn";
    let amountIn = mode === "partialFill" ? remaining * 2n : remaining / 40n;
    if (mode === "exactIn" && amountIn < 100_000n) amountIn = 100_000n;
    const rec = await checkPool(p, c, mode, amountIn);
    records.set(rec.pool, rec);
    console.log(
      `  ${rec.pool.slice(0, 8)} age ${rec.poolAgeSec}s period ${rec.schedulePeriod}/${c.poolFees.baseFee.firstFactor} (freq ${c.poolFees.baseFee.secondFactor.toString()}s) feeNumerator ${rec.baseFeeNumeratorAtClock} ${mode} ${rec.scheduleActive ? "ACTIVE" : "ended"} -> ${rec.status.toUpperCase()}${rec.timeShiftSecUsed ? " (clock shift " + rec.timeShiftSecUsed + ")" : ""}${rec.detail ? " " + rec.detail.slice(0, 80) : ""}`,
    );
    await sleep(200);
  }
  const active = [...records.values()].filter((r) => r.scheduleActive && r.status === "match").length;
  if (active >= TARGET) break;
  await sleep(20_000);
}

const recs = [...records.values()];
const summary = summarize(recs, { mode: "timing watcher" });
console.log("\nSUMMARY", JSON.stringify(summary, null, 2));
fs.mkdirSync(path.resolve("devnet-run"), { recursive: true });
fs.writeFileSync(path.resolve("devnet-run", "conformance-seed900.json"), JSON.stringify({ summary, records: recs }, null, 2));
process.exitCode = summary.mismatch ? 1 : 0;
