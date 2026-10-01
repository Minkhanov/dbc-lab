/**
 * One pool: simulate a `swap2` buy against the deployed devnet program (unsigned, nothing sent) and compare the
 * program's post-state with the simulator replaying the same buy from the pool's pre-state.
 *
 * The program's clock is read from the Clock sysvar returned by the same simulation (unix_timestamp at offset 32),
 * so time-dependent fees (scheduler, dynamic fee) are compared at the exact second the program used.
 */
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Connection, PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import BN from "bn.js";
import { DynamicBondingCurveClient, SwapMode, createDbcProgram } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { poolStateFromAccount, simConfigFromAccount } from "../../src/sim/fromSdk.js";
import { buy } from "../../src/sim/pool.js";

export const PAYER = new PublicKey(process.env.SIM_PAYER ?? "DHLXnJdACTY83yKwnUkeoDjqi4QBbsYGa1v8tJL76ViX");
export const RPC = process.env.DEVNET_RPC ?? "https://api.devnet.solana.com";
export const conn = new Connection(RPC, "confirmed");
export const client = DynamicBondingCurveClient.create(conn, "confirmed");
export const { program } = createDbcProgram(conn, "confirmed");

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function retry<T>(label: string, fn: () => Promise<T>, n = 6): Promise<T> {
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
  void label;
  throw last;
}

export type Cfg = any;
export type PoolAcc = { publicKey: PublicKey; account: any };

export interface Rec {
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
  chain?: Snapshot;
  sim?: Snapshot;
  timeShiftSecUsed?: number;
  /** true when the base-fee scheduler of this pool was still decaying at the program's clock */
  scheduleActive?: boolean;
  /** scheduler period index at the program's clock (null when no schedule) */
  schedulePeriod?: number | null;
  baseFeeNumeratorAtClock?: string;
  poolAgeSec?: number;
}
export interface Snapshot {
  baseOut: string;
  sqrtPrice: string;
  quoteReserve: string;
  partnerFee: string;
  creatorFee: string;
  protocolFee: string;
}

const u64At = (b: Buffer, off: number) => b.readBigUInt64LE(off);

async function checkPoolOnce(p: PoolAcc, c: Cfg, mode: "exactIn" | "partialFill", amountIn: bigint): Promise<{ rec: Rec; moved: boolean }> {
  const pool = p.publicKey;
  const rec: Rec = {
    pool: pool.toBase58(),
    config: p.account.poolState.config.toBase58(),
    baseFeeMode: c.poolFees.baseFee.baseFeeMode,
    collectFeeMode: c.collectFeeMode,
    dynamicFee: c.poolFees.dynamicFee.initialized !== 0,
    mode,
    amountIn: amountIn.toString(),
    clockSec: null,
    status: "chain-error",
  };
  try {
    const baseMint: PublicKey = p.account.poolState.baseMint;
    const baseInfo = await retry("mint", () => conn.getAccountInfo(baseMint));
    const baseProgram = baseInfo!.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const baseAta = getAssociatedTokenAddressSync(baseMint, PAYER, true, baseProgram);
    const preAtaInfo = await retry("ata", () => conn.getAccountInfo(baseAta));
    const preBal = preAtaInfo ? u64At(preAtaInfo.data as Buffer, 64) : 0n;

    // build the swap first (the SDK reads the pool), then take the pre-state as close to the simulation as possible
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
    const livePool = await retry("getPool", () => client.state.getPool(pool));
    if (!livePool) throw new Error("pool vanished");
    const res = await retry("simulate", () => conn.simulateTransaction(tx, undefined, [pool, baseAta, SYSVAR_CLOCK_PUBKEY]));
    if (res.value.err) {
      rec.detail = JSON.stringify(res.value.err) + " | " + (res.value.logs ?? []).filter((l) => /Error|error|failed/.test(l)).slice(-2).join(" / ");
      return { rec, moved: false };
    }
    const acc = res.value.accounts!;
    const postPool = program.coder.accounts.decode("virtualPool", Buffer.from(acc[0]!.data[0] as string, "base64"));
    const postAta = Buffer.from(acc[1]!.data[0] as string, "base64");
    const clockBuf = Buffer.from(acc[2]!.data[0] as string, "base64");
    const clockSec = Number(clockBuf.readBigInt64LE(32)); // Clock { slot, epoch_start_timestamp, epoch, leader_schedule_epoch, unix_timestamp }
    const clockSlot = Number(clockBuf.readBigUInt64LE(0));
    rec.clockSec = clockSec;

    const ps = postPool.poolState;
    rec.chain = {
      baseOut: (u64At(postAta, 64) - preBal).toString(),
      sqrtPrice: ps.sqrtPrice.toString(),
      quoteReserve: ps.quoteReserve.toString(),
      partnerFee: (c.collectFeeMode === 0 ? ps.partnerQuoteFee : ps.partnerBaseFee).toString(),
      creatorFee: (c.collectFeeMode === 0 ? ps.creatorQuoteFee : ps.creatorBaseFee).toString(),
      protocolFee: (c.collectFeeMode === 0 ? ps.protocolQuoteFee : ps.protocolBaseFee).toString(),
    };

    const slotBased = c.activationType === 0;
    const simCfg = simConfigFromAccount(c, 9);
    const act = BigInt(ps.activationPoint.toString());
    const point = slotBased ? BigInt(clockSlot) : BigInt(clockSec);
    const freq = simCfg.baseFee.periodFrequency;
    rec.poolAgeSec = clockSec - Number(act);
    if (freq > 0n && simCfg.baseFee.numberOfPeriod > 0 && point >= act) {
      const period = (point - act) / freq;
      rec.schedulePeriod = Number(period);
      rec.scheduleActive = period < BigInt(simCfg.baseFee.numberOfPeriod);
    } else {
      rec.schedulePeriod = null;
      rec.scheduleActive = false;
    }

    // the pre-state may have moved between getPool and simulate (other people trade on devnet): detect and re-baseline once
    let matched = false;
    for (const shift of [0, -1, 1]) {
      const simPool = poolStateFromAccount(livePool as never);
      let r;
      try {
        r = buy(simCfg, simPool, amountIn, mode, point + BigInt(shift), BigInt(clockSec + shift));
      } catch (e) {
        rec.status = "sim-error";
        rec.detail = (e as Error).message;
        return { rec, moved: false };
      }
      const side = simCfg.collectFeeMode === 0;
      rec.sim = {
        baseOut: r.baseOut.toString(),
        sqrtPrice: simPool.sqrtPrice.toString(),
        quoteReserve: simPool.quoteReserve.toString(),
        partnerFee: (side ? simPool.partnerQuoteFee : simPool.partnerBaseFee).toString(),
        creatorFee: (side ? simPool.creatorQuoteFee : simPool.creatorBaseFee).toString(),
        protocolFee: (side ? simPool.protocolQuoteFee : simPool.protocolBaseFee).toString(),
      };
      rec.baseFeeNumeratorAtClock = r.feeNumerator.toString();
      if (JSON.stringify(rec.sim) === JSON.stringify(rec.chain)) {
        matched = true;
        rec.timeShiftSecUsed = shift;
        break;
      }
    }
    rec.status = matched ? "match" : "mismatch";
    // did anybody trade this pool between our state read and the simulation? then a mismatch proves nothing
    const after = await retry("getPool", () => client.state.getPool(pool));
    const moved =
      !!after &&
      (after.poolState.sqrtPrice.toString() !== livePool.poolState.sqrtPrice.toString() ||
        after.poolState.quoteReserve.toString() !== livePool.poolState.quoteReserve.toString());
    return { rec, moved };
  } catch (e) {
    rec.status = "chain-error";
    rec.detail = (e as Error).message.slice(0, 200);
    return { rec, moved: false };
  }
}

export async function checkPool(p: PoolAcc, c: Cfg, mode: "exactIn" | "partialFill", amountIn: bigint): Promise<Rec> {
  let last: Rec | undefined;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { rec, moved } = await checkPoolOnce(p, c, mode, amountIn);
    last = rec;
    if (!moved || rec.status === "match") return rec;
    await sleep(500);
  }
  last!.status = "chain-error";
  last!.detail = "pool state kept changing during the check (other traders); not counted";
  return last!;
}

export function summarize(records: Rec[], extra: Record<string, unknown> = {}) {
  const count = (s: Rec["status"]) => records.filter((r) => r.status === s).length;
  return {
    when: new Date().toISOString(),
    rpc: RPC,
    ...extra,
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
    scheduleStillDecaying: records.filter((r) => r.scheduleActive).length,
    note: "Programmatic simulateTransaction against the deployed devnet DBC program; no transaction was sent, no signature produced.",
  };
}
