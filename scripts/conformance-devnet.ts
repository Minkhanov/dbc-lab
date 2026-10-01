/**
 * Simulator-vs-program conformance on REAL devnet DBC pools, without spending any SOL.
 *
 * For each sampled live pool (wSOL quote, scheduler base fee):
 *   1. build a `swap2` buy with the official SDK (owner/payer = a funded devnet system account, UNSIGNED),
 *   2. run `simulateTransaction` (sigVerify off, nothing is sent, no funds can move) asking for the post-state of the pool
 *      account and the buyer's base-token account,
 *   3. replay the same buy with our bigint simulator, starting from the pool's PRE state,
 *   4. compare: tokens received, sqrt price, quote reserve, partner/creator/protocol fee accumulators.
 *
 * Usage: tsx scripts/conformance-devnet.ts [maxPools=60] [seed=1]
 */
import { NATIVE_MINT, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import fs from "node:fs";
import path from "node:path";
import { DynamicBondingCurveClient, SwapMode, createDbcProgram } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { simConfigFromAccount, poolStateFromAccount } from "../src/sim/fromSdk.js";
import { buy } from "../src/sim/pool.js";
import { baseFeeNumerator } from "../src/sim/fees.js";
import { mulberry32 } from "../tests/helpers.js";

const MAX = Number(process.argv[2] ?? 60);
const SEED = Number(process.argv[3] ?? 1);
const PAYER = new PublicKey(process.env.SIM_PAYER ?? "DHLXnJdACTY83yKwnUkeoDjqi4QBbsYGa1v8tJL76ViX");
const RPC = process.env.DEVNET_RPC ?? "https://api.devnet.solana.com";
const conn = new Connection(RPC, "confirmed");
const client = DynamicBondingCurveClient.create(conn, "confirmed");
const { program } = createDbcProgram(conn, "confirmed");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function retry<T>(label: string, fn: () => Promise<T>, n = 6): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= n; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const m = String((e as Error).message);
      if (!/429|timeout|timed out|fetch failed|ECONNRESET|503|502|504|Too many/i.test(m) || i === n) break;
      await sleep(Math.min(20000, 1000 * 2 ** i));
    }
  }
  throw last;
}

const big = (x: { toString(): string }) => BigInt(x.toString());
const u64At = (b: Buffer, off: number) => b.readBigUInt64LE(off);

interface Rec {
  pool: string;
  config: string;
  baseFeeMode: number;
  collectFeeMode: number;
  dynamicFee: boolean;
  mode: "exactIn" | "partialFill";
  amountIn: string;
  clockSec: number | null;
  status: "match" | "mismatch" | "sim-error" | "chain-error";
  detail?: string;
  chain?: { baseOut: string; sqrtPrice: string; quoteReserve: string; partnerFee: string; creatorFee: string; protocolFee: string };
  sim?: { baseOut: string; sqrtPrice: string; quoteReserve: string; partnerFee: string; creatorFee: string; protocolFee: string };
  timeShiftSecUsed?: number;
}

// ---- 1. sample candidate pools -------------------------------------------------------------------
console.log("loading all DBC pools from devnet ...");
const all = await retry("getPools", () => client.state.getPools());
console.log("pools:", all.length);
const rand = mulberry32(SEED);
const cand = all.filter((p) => p.account.poolState.isMigrated === 0 && p.account.poolState.hasSwap === 1);
for (let i = cand.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [cand[i], cand[j]] = [cand[j]!, cand[i]!];
}
const sample = cand.slice(0, Math.min(cand.length, MAX * 12));

// ---- 2. fetch + decode configs in batches ----------------------------------------------------------
const cfgKeys = [...new Set(sample.map((p) => p.account.poolState.config.toBase58()))];
const cfgMap = new Map<string, ReturnType<typeof program.coder.accounts.decode>>();
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

type Cfg = any;
const eligible = sample.filter((p) => {
  const c = cfgMap.get(p.account.poolState.config.toBase58()) as Cfg | undefined;
  if (!c) return false;
  if (!new PublicKey(c.quoteMint).equals(NATIVE_MINT)) return false;
  if (c.poolFees.baseFee.baseFeeMode > 1) return false; // rate limiter: unsupported in the sim
  if (c.quoteTokenFlag !== 0) return false;
  if (p.account.poolState.quoteReserve.gte(c.migrationQuoteThreshold)) return false;
  const remaining = BigInt(c.migrationQuoteThreshold.toString()) - BigInt(p.account.poolState.quoteReserve.toString());
  return remaining > 5_000_000n; // room for a buy
});
console.log(`eligible (wSOL quote, scheduler fee, open curve): ${eligible.length}; testing up to ${MAX}`);

// ---- 3. simulate + compare -----------------------------------------------------------------------
const records: Rec[] = [];
let n = 0;
for (const p of eligible) {
  if (n >= MAX) break;
  const pool = p.publicKey;
  const cfgKey = p.account.poolState.config;
  const c = cfgMap.get(cfgKey.toBase58()) as Cfg;
  const remaining = BigInt(c.migrationQuoteThreshold.toString()) - BigInt(p.account.poolState.quoteReserve.toString());
  const mode: "exactIn" | "partialFill" = n % 5 === 4 ? "partialFill" : "exactIn";
  let amountIn = mode === "partialFill" ? remaining * 2n : remaining / 40n;
  if (mode === "exactIn" && amountIn < 100_000n) amountIn = 100_000n;
  const rec: Rec = {
    pool: pool.toBase58(),
    config: cfgKey.toBase58(),
    baseFeeMode: c.poolFees.baseFee.baseFeeMode,
    collectFeeMode: c.collectFeeMode,
    dynamicFee: c.poolFees.dynamicFee.initialized !== 0,
    mode,
    amountIn: amountIn.toString(),
    clockSec: null,
    status: "chain-error",
  };
  n++;
  try {
    const baseMint = p.account.poolState.baseMint;
    const baseInfo = await retry("mint", () => conn.getAccountInfo(baseMint));
    const baseProgram = baseInfo!.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const baseAta = getAssociatedTokenAddressSync(baseMint, PAYER, true, baseProgram);
    const preAtaInfo = await retry("ata", () => conn.getAccountInfo(baseAta));
    const preBal = preAtaInfo ? u64At(preAtaInfo.data as Buffer, 64) : 0n;

    // fresh pool state right before simulation
    const livePool = await retry("getPool", () => client.state.getPool(pool));
    if (!livePool) throw new Error("pool vanished");
    const tx = await client.pool.swap2({
      owner: PAYER,
      payer: PAYER,
      pool,
      swapBaseForQuote: false,
      swapMode: mode === "exactIn" ? SwapMode.ExactIn : SwapMode.PartialFill,
      amountIn: new BN(amountIn.toString()),
      minimumAmountOut: new BN(0),
      referralTokenAccount: null,
    });
    tx.feePayer = PAYER;
    const res = await retry("simulate", () => conn.simulateTransaction(tx, undefined, [pool, baseAta]));
    if (res.value.err) {
      rec.status = "chain-error";
      rec.detail = JSON.stringify(res.value.err) + " | " + (res.value.logs ?? []).filter((l) => /Error|error|failed/.test(l)).slice(-2).join(" / ");
      records.push(rec);
      console.log(`[${n}/${MAX}] ${pool.toBase58().slice(0, 8)} chain-error ${rec.detail?.slice(0, 120)}`);
      await sleep(250);
      continue;
    }
    const postPool = program.coder.accounts.decode("virtualPool", Buffer.from(res.value.accounts![0]!.data[0] as string, "base64"));
    const postAta = Buffer.from(res.value.accounts![1]!.data[0] as string, "base64");
    const chainOut = u64At(postAta, 64) - preBal;
    const ps = postPool.poolState;
    rec.chain = {
      baseOut: chainOut.toString(),
      sqrtPrice: ps.sqrtPrice.toString(),
      quoteReserve: ps.quoteReserve.toString(),
      partnerFee: (c.collectFeeMode === 0 ? ps.partnerQuoteFee : ps.partnerBaseFee).toString(),
      creatorFee: (c.collectFeeMode === 0 ? ps.creatorQuoteFee : ps.creatorBaseFee).toString(),
      protocolFee: (c.collectFeeMode === 0 ? ps.protocolQuoteFee : ps.protocolBaseFee).toString(),
    };

    // clock of the simulation
    let clock: number | null = null;
    try {
      clock = await retry("getBlockTime", () => conn.getBlockTime(res.context.slot));
    } catch {
      clock = null;
    }
    clock ??= Math.floor(Date.now() / 1000);
    rec.clockSec = clock;
    const slotBased = c.activationType === 0;

    // sim, trying small clock shifts (block time vs Clock sysvar can differ by a second)
    const simCfg = simConfigFromAccount(c, 9);
    let matched = false;
    let lastSim: Rec["sim"];
    for (const shift of [0, -1, 1, -2, 2]) {
      const simPool = poolStateFromAccount(livePool as never);
      const point = slotBased ? BigInt(res.context.slot + shift) : BigInt(clock + shift);
      const nowTs = BigInt(clock + shift);
      let r;
      try {
        r = buy(simCfg, simPool, amountIn, mode, point, nowTs);
      } catch (e) {
        rec.status = "sim-error";
        rec.detail = (e as Error).message;
        break;
      }
      const feeSide = simCfg.collectFeeMode === 0;
      lastSim = {
        baseOut: r.baseOut.toString(),
        sqrtPrice: simPool.sqrtPrice.toString(),
        quoteReserve: simPool.quoteReserve.toString(),
        partnerFee: (feeSide ? simPool.partnerQuoteFee : simPool.partnerBaseFee).toString(),
        creatorFee: (feeSide ? simPool.creatorQuoteFee : simPool.creatorBaseFee).toString(),
        protocolFee: (feeSide ? simPool.protocolQuoteFee : simPool.protocolBaseFee).toString(),
      };
      if (JSON.stringify(lastSim) === JSON.stringify(rec.chain)) {
        matched = true;
        rec.timeShiftSecUsed = shift;
        break;
      }
      // if the fee numerator does not change inside the shift window, further shifts are pointless
      const f0 = baseFeeNumerator(simCfg.baseFee, point, simPool.activationPoint);
      const f1 = baseFeeNumerator(simCfg.baseFee, point + 2n, simPool.activationPoint);
      const fm = baseFeeNumerator(simCfg.baseFee, point - 2n > simPool.activationPoint ? point - 2n : simPool.activationPoint, simPool.activationPoint);
      if (f0 === f1 && f0 === fm && !simCfg.dynamicFee) break;
    }
    rec.sim = lastSim;
    if (rec.status !== "sim-error") rec.status = matched ? "match" : "mismatch";
  } catch (e) {
    rec.status = "chain-error";
    rec.detail = (e as Error).message.slice(0, 200);
  }
  records.push(rec);
  const tag = rec.status === "match" ? "MATCH" : rec.status.toUpperCase();
  console.log(
    `[${n}/${MAX}] ${rec.pool.slice(0, 8)} ${mode.padEnd(11)} fee=${rec.baseFeeMode === 0 ? "lin" : "exp"}${rec.dynamicFee ? "+dyn" : ""} collect=${rec.collectFeeMode} ${tag}${rec.status === "mismatch" ? " chain=" + JSON.stringify(rec.chain) + " sim=" + JSON.stringify(rec.sim) : ""}${rec.detail ? " " + rec.detail.slice(0, 100) : ""}`,
  );
  await sleep(250);
}

const count = (s: Rec["status"]) => records.filter((r) => r.status === s).length;
const summary = {
  when: new Date().toISOString(),
  rpc: RPC,
  seed: SEED,
  testedPools: records.length,
  match: count("match"),
  mismatch: count("mismatch"),
  simError: count("sim-error"),
  chainError: count("chain-error"),
  matchedWithClockShift: records.filter((r) => r.status === "match" && (r.timeShiftSecUsed ?? 0) !== 0).length,
  withDynamicFee: records.filter((r) => r.dynamicFee).length,
  outputTokenMode: records.filter((r) => r.collectFeeMode === 1).length,
  exponentialScheduler: records.filter((r) => r.baseFeeMode === 1).length,
  partialFill: records.filter((r) => r.mode === "partialFill").length,
  note: "Programmatic simulateTransaction against the deployed devnet DBC program; no transaction was sent, no signature produced.",
};
console.log("\nSUMMARY", JSON.stringify(summary, null, 2));
fs.mkdirSync(path.resolve("devnet-run"), { recursive: true });
fs.writeFileSync(path.resolve("devnet-run", "conformance.json"), JSON.stringify({ summary, records }, null, 2));
process.exitCode = summary.mismatch ? 1 : 0;
