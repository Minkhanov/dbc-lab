/**
 * Simulator-vs-program conformance on REAL devnet DBC pools, without spending any SOL.
 *
 * For each sampled live pool (wSOL quote, scheduler base fee):
 *   1. build a `swap2` buy with the official SDK (owner/payer = a funded devnet system account, UNSIGNED),
 *   2. run `simulateTransaction` (sigVerify off, nothing is sent, no funds can move) asking for the post-state of the pool,
 *      the buyer's base-token account and the Clock sysvar,
 *   3. replay the same buy with our bigint simulator, starting from the pool's PRE state, at the program's clock,
 *   4. compare: tokens received, sqrt price, quote reserve, partner/creator/protocol fee accumulators.
 *
 * Usage: tsx scripts/conformance-devnet.ts [maxPools=60] [seed=1]
 */
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import { mulberry32 } from "../tests/helpers.js";
import { PAYER, RPC, checkPool, client, conn, program, retry, sleep, summarize, type Cfg, type Rec } from "./lib/checkPool.js";

const MAX = Number(process.argv[2] ?? 60);
const SEED = Number(process.argv[3] ?? 1);

console.log("loading all DBC pools from devnet ...");
const all = await retry("getPools", () => client.state.getPools());
console.log("pools:", all.length, " (simulated payer, unsigned:", PAYER.toBase58() + ", rpc:", RPC + ")");
const rand = mulberry32(SEED);
const cand = all.filter((p) => p.account.poolState.isMigrated === 0 && p.account.poolState.hasSwap === 1);
for (let i = cand.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [cand[i], cand[j]] = [cand[j]!, cand[i]!];
}
const sample = cand.slice(0, Math.min(cand.length, MAX * 12));

const cfgKeys = [...new Set(sample.map((p) => p.account.poolState.config.toBase58()))];
const cfgMap = new Map<string, Cfg>();
for (let i = 0; i < cfgKeys.length; i += 100) {
  const chunk = cfgKeys.slice(i, i + 100).map((k) => new PublicKey(k));
  const infos = await retry("getMultipleAccountsInfo", () => conn.getMultipleAccountsInfo(chunk));
  infos.forEach((info, idx) => {
    if (!info) return;
    try {
      cfgMap.set(chunk[idx]!.toBase58(), program.coder.accounts.decode("poolConfig", info.data));
    } catch {
      /* transfer-hook config or other layout: skip */
    }
  });
  await sleep(300);
}

const eligible = sample.filter((p) => {
  const c = cfgMap.get(p.account.poolState.config.toBase58());
  if (!c) return false;
  if (!new PublicKey(c.quoteMint).equals(NATIVE_MINT)) return false;
  if (c.poolFees.baseFee.baseFeeMode > 1) return false; // rate limiter: unsupported in the sim
  if (c.quoteTokenFlag !== 0) return false;
  if (p.account.poolState.quoteReserve.gte(c.migrationQuoteThreshold)) return false;
  const remaining = BigInt(c.migrationQuoteThreshold.toString()) - BigInt(p.account.poolState.quoteReserve.toString());
  // room for a buy, but small enough that the (unsigned, simulated) payer can afford to wrap the input (partial fills use 2x remaining)
  return remaining > 5_000_000n && remaining < 300_000_000_000n;
});
console.log(`eligible (wSOL quote, scheduler fee, open curve): ${eligible.length}; testing up to ${MAX}`);

const records: Rec[] = [];
let n = 0;
for (const p of eligible) {
  if (n >= MAX) break;
  const c = cfgMap.get(p.account.poolState.config.toBase58())!;
  const remaining = BigInt(c.migrationQuoteThreshold.toString()) - BigInt(p.account.poolState.quoteReserve.toString());
  const mode: "exactIn" | "partialFill" = n % 5 === 4 ? "partialFill" : "exactIn";
  let amountIn = mode === "partialFill" ? remaining * 2n : remaining / 40n;
  if (mode === "exactIn" && amountIn < 100_000n) amountIn = 100_000n;
  n++;
  const rec = await checkPool(p, c, mode, amountIn);
  records.push(rec);
  console.log(
    `[${n}/${MAX}] ${rec.pool.slice(0, 8)} ${mode.padEnd(11)} fee=${rec.baseFeeMode === 0 ? "lin" : "exp"}${rec.dynamicFee ? "+dyn" : ""} collect=${rec.collectFeeMode}${rec.scheduleActive ? " sched-active" : ""} ${rec.status.toUpperCase()}${rec.status === "mismatch" ? " chain=" + JSON.stringify(rec.chain) + " sim=" + JSON.stringify(rec.sim) : ""}${rec.detail ? " " + rec.detail.slice(0, 100) : ""}`,
  );
  await sleep(250);
}

const summary = summarize(records, { seed: SEED });
console.log("\nSUMMARY", JSON.stringify(summary, null, 2));
fs.mkdirSync(path.resolve("devnet-run"), { recursive: true });
fs.writeFileSync(path.resolve("devnet-run", `conformance-seed${SEED}.json`), JSON.stringify({ summary, records }, null, 2));
process.exitCode = summary.mismatch ? 1 : 0;
