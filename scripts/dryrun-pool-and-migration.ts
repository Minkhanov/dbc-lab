/**
 * Dry runs (unsigned `simulateTransaction`, nothing sent, no SOL needed) of the two SDK calls our devnet runner depends on:
 *   1. `creator.createPool` against an existing devnet config,
 *   2. `migration.migrateToDammV2` against completed-but-unmigrated devnet pools,
 *      followed by a comparison of the resulting DAMM v2 pool with our simulator's `migrationOutcome()`.
 *
 * The fee payer is an arbitrary funded devnet system account used only as a public address (never signs).
 */
import { NATIVE_MINT } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";
import {
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  DynamicBondingCurveClient,
  createDammV2Program,
  createDbcProgram,
  deriveDammV2PoolAddress,
  deriveDbcPoolAddress,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { simConfigFromAccount } from "../src/sim/fromSdk.js";
import { migrationOutcome } from "../src/sim/migration.js";

const PAYER = new PublicKey(process.env.SIM_PAYER ?? "DHLXnJdACTY83yKwnUkeoDjqi4QBbsYGa1v8tJL76ViX");
const conn = new Connection(process.env.DEVNET_RPC ?? "https://api.devnet.solana.com", "confirmed");
const client = DynamicBondingCurveClient.create(conn, "confirmed");
const { program } = createDbcProgram(conn, "confirmed");
const dammProgram = createDammV2Program(conn, "confirmed");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const out: string[] = [];
const say = (m: string) => {
  console.log(m);
  out.push(m);
};

async function retry<T>(fn: () => Promise<T>, n = 6): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= n; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!/429|timeout|fetch failed|ECONNRESET|503|502|504|Too many/i.test(String((e as Error).message)) || i === n) break;
      await sleep(Math.min(20000, 1000 * 2 ** i));
    }
  }
  throw last;
}

const all = await retry(() => client.state.getPools());
say(`devnet DBC pools: ${all.length}`);

// ---------------------------------------------------------------------------------------------
// 1. createPool against an existing config
// ---------------------------------------------------------------------------------------------
const cfgKeys = [...new Set(all.slice(0, 4000).map((p) => p.account.poolState.config.toBase58()))].slice(0, 300);
let createdOk = false;
for (let i = 0; i < cfgKeys.length && !createdOk; i += 100) {
  const chunk = cfgKeys.slice(i, i + 100).map((k) => new PublicKey(k));
  const infos = await retry(() => conn.getMultipleAccountsInfo(chunk));
  for (let j = 0; j < infos.length && !createdOk; j++) {
    const info = infos[j];
    if (!info) continue;
    let c: any;
    try {
      c = program.coder.accounts.decode("poolConfig", info.data);
    } catch {
      continue;
    }
    if (!new PublicKey(c.quoteMint).equals(NATIVE_MINT) || c.quoteTokenFlag !== 0 || c.tokenType !== 0) continue;
    if (c.poolCreationFee.toString() !== "0") continue;
    const baseMint = Keypair.generate().publicKey;
    const tx = await client.creator.createPool({
      baseMint,
      config: chunk[j]!,
      name: "DBC Lab dry run",
      symbol: "DRY",
      uri: "https://example.com/dry.json",
      payer: PAYER,
      poolCreator: PAYER,
    });
    tx.feePayer = PAYER;
    const pool = deriveDbcPoolAddress(NATIVE_MINT, baseMint, chunk[j]!);
    const res = await retry(() => conn.simulateTransaction(tx, undefined, [pool]));
    if (res.value.err) {
      say(`createPool dry run on config ${chunk[j]!.toBase58().slice(0, 8)}: rejected ${JSON.stringify(res.value.err)} ${(res.value.logs ?? []).slice(-3).join(" | ").slice(0, 200)}`);
      continue;
    }
    const post = program.coder.accounts.decode("virtualPool", Buffer.from(res.value.accounts![0]!.data[0] as string, "base64"));
    say(
      `createPool dry run OK on config ${chunk[j]!.toBase58()}: virtual pool ${pool.toBase58()} would start at sqrtPrice ${post.poolState.sqrtPrice.toString()} (config sqrtStartPrice ${c.sqrtStartPrice.toString()}), creator ${new PublicKey(post.poolState.creator).toBase58() === PAYER.toBase58() ? "= payer" : "?"}`,
    );
    createdOk = true;
  }
}
if (!createdOk) say("createPool dry run: no suitable config found");

// ---------------------------------------------------------------------------------------------
// 2. migrateToDammV2 against completed, unmigrated pools
// ---------------------------------------------------------------------------------------------
const unmigrated = all.filter((p) => p.account.poolState.isMigrated === 0 && p.account.poolState.migrationProgress >= 0);
const cfgOf = new Map<string, any>();
const need = [...new Set(unmigrated.map((p) => p.account.poolState.config.toBase58()))];
for (let i = 0; i < need.length; i += 100) {
  const chunk = need.slice(i, i + 100).map((k) => new PublicKey(k));
  const infos = await retry(() => conn.getMultipleAccountsInfo(chunk));
  infos.forEach((info, idx) => {
    if (!info) return;
    try {
      cfgOf.set(chunk[idx]!.toBase58(), program.coder.accounts.decode("poolConfig", info.data));
    } catch {
      /* skip transfer-hook configs */
    }
  });
  await sleep(250);
}
const done = unmigrated.filter((p) => {
  const c = cfgOf.get(p.account.poolState.config.toBase58());
  return c && p.account.poolState.quoteReserve.gte(c.migrationQuoteThreshold) && new PublicKey(c.quoteMint).equals(NATIVE_MINT) && c.migrationOption === 1 && c.tokenType === 0;
});
say(`completed-but-unmigrated SOL-quote DAMM-v2 pools on devnet: ${done.length}`);

let tried = 0;
let ok = 0;
const rows: string[] = [];
for (const p of done.slice(0, 40)) {
  const c = cfgOf.get(p.account.poolState.config.toBase58());
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[c.migrationFeeOption];
  if (!dammConfig) continue;
  tried++;
  try {
    const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } = await client.migration.migrateToDammV2({ payer: PAYER, pool: p.publicKey, dammConfig });
    transaction.feePayer = PAYER;
    const dammPool = deriveDammV2PoolAddress(dammConfig, p.account.poolState.baseMint, NATIVE_MINT);
    void firstPositionNftKeypair;
    void secondPositionNftKeypair;
    const res = await retry(() => conn.simulateTransaction(transaction, undefined, [dammPool]));
    if (res.value.err) {
      rows.push(`  ${p.publicKey.toBase58().slice(0, 8)} migrate dry run: rejected ${JSON.stringify(res.value.err)} ${(res.value.logs ?? []).filter((l) => /rror/.test(l)).slice(-1).join("").slice(0, 120)}`);
      continue;
    }
    const acc = res.value.accounts![0];
    if (!acc) {
      rows.push(`  ${p.publicKey.toBase58().slice(0, 8)} migrate dry run OK but no DAMM account returned`);
      continue;
    }
    const damm = dammProgram.coder.accounts.decode("pool", Buffer.from(acc.data[0] as string, "base64"));
    const sim = simConfigFromAccount(c, 9);
    const mig = migrationOutcome(sim);
    const priceEq = damm.sqrtPrice.toString() === sim.migrationSqrtPrice.toString();
    rows.push(
      `  ${p.publicKey.toBase58().slice(0, 8)} migrate dry run OK: DAMM v2 pool ${dammPool.toBase58().slice(0, 8)} sqrtPrice == DBC migration sqrtPrice: ${priceEq ? "yes" : "NO"}; ` +
        `liquidity ${damm.liquidity.toString()}; sim pool deposit quote=${mig.poolQuote} base=${mig.poolBase}`,
    );
    if (priceEq) ok++;
  } catch (e) {
    rows.push(`  ${p.publicKey.toBase58().slice(0, 8)} migrate dry run error: ${(e as Error).message.slice(0, 160)}`);
  }
  await sleep(400);
}
say(`migrateToDammV2 dry runs: ${tried} tried, ${ok} with DAMM v2 opening price equal to the DBC migration price`);
for (const r of rows) say(r);

fs.mkdirSync(path.resolve("devnet-run"), { recursive: true });
fs.writeFileSync(path.resolve("devnet-run", "dryrun-pool-migration.txt"), out.join(String.fromCharCode(10)) + String.fromCharCode(10));
