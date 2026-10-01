/**
 * DEVNET integration run (staged, resumable). Uses ONLY the throw-away keypair in keys/devnet-test.json.
 *
 *   tsx src/devnet/run.ts config     create DBC config account from a LaunchSpec preset
 *   tsx src/devnet/run.ts pool       create the virtual pool (base mint + vaults + metadata)
 *   tsx src/devnet/run.ts buys       a series of buys paid by the same wallet, compared to the simulator
 *   tsx src/devnet/run.ts migrate    migrate the completed pool to DAMM v2
 *   tsx src/devnet/run.ts all        everything above, skipping finished stages
 *
 * Every stage writes devnet-run/state.json (public data only). Nothing here touches mainnet.
 */
import { NATIVE_MINT, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import fs from "node:fs";
import path from "node:path";
import {
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  DynamicBondingCurveClient,
  SwapMode,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getPreset } from "../presets/library.js";
import { buildLaunch } from "../presets/build.js";
import { simConfigFromAccount } from "../sim/fromSdk.js";
import { buy, initPool, isCurveComplete } from "../sim/pool.js";
import type { SimConfig } from "../sim/types.js";
import {
  COMMITMENT,
  KEY_PATH,
  ROOT,
  connect,
  explorerAddr,
  explorerTx,
  loadPayer,
  loadState,
  saveState,
  sendTx,
  sleep,
  withRetry,
  type BuyRecord,
  type RunState,
  type TxRecord,
} from "./common.js";

const PRESET_ID = process.env.PRESET ?? "devnet-micro";
const bnToBig = (x: { toString(): string }): bigint => BigInt(x.toString());

function secretPath(name: string): string {
  return path.join(ROOT, "keys", name);
}
function loadOrCreateKeypair(file: string): Keypair {
  const p = secretPath(file);
  if (fs.existsSync(p)) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, "utf8"))));
  const kp = Keypair.generate();
  fs.writeFileSync(p, JSON.stringify(Array.from(kp.secretKey)), { mode: 0o600 });
  return kp;
}

const toRecord = (label: string, r: { sig: string; slot: number; blockTime: number | null }): TxRecord => ({ label, ...r });

async function requireBalance(conn: ReturnType<typeof connect>, payer: Keypair, minSol: number): Promise<number> {
  const bal = await withRetry("getBalance", () => conn.getBalance(payer.publicKey, COMMITMENT));
  console.log(`payer ${payer.publicKey.toBase58()} balance: ${bal / LAMPORTS_PER_SOL} SOL`);
  if (bal < minSol * LAMPORTS_PER_SOL) {
    throw new Error(`devnet balance too low (${bal / LAMPORTS_PER_SOL} SOL < ${minSol} SOL). Airdrop first.`);
  }
  return bal;
}

// ------------------------------------------------------------------------------------------------
// stage: config
// ------------------------------------------------------------------------------------------------
async function stageConfig(state: RunState): Promise<void> {
  if (state.config) return console.log("config: already done", state.config.address);
  const conn = connect();
  const payer = loadPayer();
  await requireBalance(conn, payer, 0.05);
  const client = DynamicBondingCurveClient.create(conn, COMMITMENT);

  const spec = getPreset(PRESET_ID);
  const { params, sim } = buildLaunch(spec);
  const configKp = loadOrCreateKeypair("config.json");

  const tx = await client.partner.createConfig({
    config: configKp.publicKey,
    feeClaimer: payer.publicKey,
    leftoverReceiver: payer.publicKey,
    payer: payer.publicKey,
    quoteMint: NATIVE_MINT,
    ...params,
  });
  const res = await sendTx(conn, tx, [payer, configKp], "createConfig");
  console.log("config created", configKp.publicKey.toBase58(), res.sig);

  state.presetId = PRESET_ID;
  state.payer = payer.publicKey.toBase58();
  state.startedAt ??= new Date().toISOString();
  state.config = { address: configKp.publicKey.toBase58(), tx: toRecord("create_config", res) };

  // simulator vs. on-chain config: values derived by the PROGRAM must equal the ones the simulator derives itself
  const acc = await withRetry("getPoolConfig", async () => {
    const a = await client.state.getPoolConfig(configKp.publicKey);
    if (!a) throw new Error("timeout: config account not visible yet");
    return a;
  });
  const chainSim = simConfigFromAccount(acc as never, sim.quoteDecimals);
  const cmp = (k: string, chain: bigint, mine: bigint) => ({ [k]: { chain: chain.toString(), sim: mine.toString(), equal: chain === mine } });
  state.configCheck = {
    ...cmp("migrationSqrtPrice", chainSim.migrationSqrtPrice, sim.migrationSqrtPrice),
    ...cmp("migrationQuoteThreshold", chainSim.migrationQuoteThreshold, sim.migrationQuoteThreshold),
    ...cmp("sqrtStartPrice", chainSim.sqrtStartPrice, sim.sqrtStartPrice),
    ...cmp("cliffFeeNumerator", chainSim.baseFee.cliffFeeNumerator, sim.baseFee.cliffFeeNumerator),
    ...cmp("curveSegments", BigInt(chainSim.curve.length), BigInt(sim.curve.length)),
  };
  saveState(state);
}

// ------------------------------------------------------------------------------------------------
// stage: pool
// ------------------------------------------------------------------------------------------------
async function stagePool(state: RunState): Promise<void> {
  if (state.pool) return console.log("pool: already done", state.pool.address);
  if (!state.config) throw new Error("run config stage first");
  const conn = connect();
  const payer = loadPayer();
  await requireBalance(conn, payer, 0.08);
  const client = DynamicBondingCurveClient.create(conn, COMMITMENT);
  const baseMint = loadOrCreateKeypair("basemint.json");
  const config = new PublicKey(state.config.address);

  const tx = await client.creator.createPool({
    baseMint: baseMint.publicKey,
    config,
    name: "DBC Lab Devnet",
    symbol: "DBCLAB",
    uri: "https://example.com/dbc-lab-devnet.json",
    payer: payer.publicKey,
    poolCreator: payer.publicKey,
  });
  const res = await sendTx(conn, tx, [payer, baseMint], "createPool");
  const { deriveDbcPoolAddress } = await import("@meteora-ag/dynamic-bonding-curve-sdk");
  const pool = deriveDbcPoolAddress(NATIVE_MINT, baseMint.publicKey, config);
  const poolAcc = await withRetry("getPool", async () => {
    const p = await client.state.getPool(pool);
    if (!p) throw new Error("timeout: pool account not visible yet");
    return p;
  });
  state.baseMint = baseMint.publicKey.toBase58();
  state.pool = {
    address: pool.toBase58(),
    activationPoint: poolAcc.poolState.activationPoint.toString(),
    tx: toRecord("create_pool", res),
  };
  console.log("pool created", state.pool.address, "activationPoint", state.pool.activationPoint, res.sig);
  saveState(state);
}

// ------------------------------------------------------------------------------------------------
// stage: buys
// ------------------------------------------------------------------------------------------------
/** Buy plan in lamports of SOL (quote). The last entries are sized to cross the migration threshold via partial fill. */
function buyPlan(sim: SimConfig): { lamports: bigint; mode: "exactIn" | "partialFill"; pauseMs: number }[] {
  const thr = sim.migrationQuoteThreshold;
  const plan: { lamports: bigint; mode: "exactIn" | "partialFill"; pauseMs: number }[] = [];
  // 8 small buys, ~8 s apart => spans the 60 s fee decay window of the devnet-micro preset
  const slice = thr / 25n; // 4% of threshold each (~32% total)
  for (let i = 0; i < 8; i++) plan.push({ lamports: slice, mode: "exactIn", pauseMs: 8000 });
  // two bigger buys, then a deliberately oversized partial fill that must stop at the migration price
  plan.push({ lamports: thr / 10n, mode: "exactIn", pauseMs: 2000 });
  plan.push({ lamports: thr / 5n, mode: "exactIn", pauseMs: 2000 });
  plan.push({ lamports: thr, mode: "partialFill", pauseMs: 0 });
  return plan;
}

async function readPoolSnapshot(client: DynamicBondingCurveClient, pool: PublicKey) {
  const p = await withRetry("getPool", async () => {
    const x = await client.state.getPool(pool);
    if (!x) throw new Error("timeout: pool not found");
    return x;
  });
  const s = p.poolState;
  return {
    sqrtPrice: bnToBig(s.sqrtPrice),
    quoteReserve: bnToBig(s.quoteReserve),
    partnerQuote: bnToBig(s.partnerQuoteFee),
    creatorQuote: bnToBig(s.creatorQuoteFee),
    protocolQuote: bnToBig(s.protocolQuoteFee),
  };
}

async function tokenBalance(conn: ReturnType<typeof connect>, ata: PublicKey): Promise<bigint> {
  try {
    const r = await withRetry("getTokenAccountBalance", () => conn.getTokenAccountBalance(ata, COMMITMENT));
    return BigInt(r.value.amount);
  } catch (e) {
    if (/could not find account|Invalid param/i.test(String((e as Error).message))) return 0n;
    throw e;
  }
}

async function stageBuys(state: RunState): Promise<void> {
  if (!state.pool || !state.config || !state.baseMint) throw new Error("run pool stage first");
  if (state.curveCompleteAt) return console.log("buys: curve already complete");
  const conn = connect();
  const payer = loadPayer();
  await requireBalance(conn, payer, 0.3);
  const client = DynamicBondingCurveClient.create(conn, COMMITMENT);
  const pool = new PublicKey(state.pool.address);
  const configPk = new PublicKey(state.config.address);
  const baseMint = new PublicKey(state.baseMint);
  const baseAta = getAssociatedTokenAddressSync(baseMint, payer.publicKey, false);

  const configAcc = await withRetry("getPoolConfig", async () => {
    const a = await client.state.getPoolConfig(configPk);
    if (!a) throw new Error("config not found");
    return a;
  });
  const sim = simConfigFromAccount(configAcc as never, 9);
  const activationPoint = BigInt(state.pool.activationPoint);

  // rebuild the sim from the already executed buys (resume support)
  const simPool = initPool(sim, activationPoint);
  state.buys ??= [];
  for (const b of state.buys) {
    buy(sim, simPool, BigInt(b.amountInLamports), b.mode, BigInt(b.point), BigInt(b.point));
  }

  const plan = buyPlan(sim);
  for (let i = state.buys.length; i < plan.length; i++) {
    const step = plan[i]!;
    if (isCurveComplete(sim, simPool)) break;
    const live = await client.state.getPool(pool);
    if (!live) throw new Error("pool vanished");
    if (live.poolState.quoteReserve.gte(configAcc.migrationQuoteThreshold)) {
      console.log("curve is complete on chain");
      break;
    }
    // SDK quote (what a UI would show) at the local clock
    const localPoint = new BN(Math.floor(Date.now() / 1000));
    const sdkQuote = client.pool.swapQuote2({
      virtualPool: live,
      config: configAcc,
      swapBaseForQuote: false,
      swapMode: step.mode === "exactIn" ? SwapMode.ExactIn : SwapMode.PartialFill,
      amountIn: new BN(step.lamports.toString()),
      slippageBps: 500,
      hasReferral: false,
      eligibleForFirstSwapWithMinFee: false,
      currentPoint: localPoint,
    });

    const balBefore = await tokenBalance(conn, baseAta);
    const tx = await client.pool.swap2({
      owner: payer.publicKey,
      payer: payer.publicKey,
      pool,
      swapBaseForQuote: false,
      swapMode: step.mode === "exactIn" ? SwapMode.ExactIn : SwapMode.PartialFill,
      amountIn: new BN(step.lamports.toString()),
      minimumAmountOut: sdkQuote.minimumAmountOut ?? new BN(0),
      referralTokenAccount: null,
    });
    const res = await sendTx(conn, tx, [payer], `swap2#${i}`);
    const balAfter = await tokenBalance(conn, baseAta);
    const chainOut = balAfter - balBefore;
    const snap = await readPoolSnapshot(client, pool);

    // sim step at the on-chain block time of this very transaction
    const point = BigInt(res.blockTime ?? Math.floor(Date.now() / 1000));
    const simRes = buy(sim, simPool, step.lamports, step.mode, point, point);

    const rec: BuyRecord = {
      index: i,
      mode: step.mode,
      amountInLamports: step.lamports.toString(),
      tx: toRecord(`swap2 #${i}`, res),
      point: Number(point),
      sdkQuoteBaseOut: sdkQuote.outputAmount.toString(),
      simBaseOut: simRes.baseOut.toString(),
      chainBaseOut: chainOut.toString(),
      simFeeNumerator: simRes.feeNumerator.toString(),
      chainSqrtPriceAfter: snap.sqrtPrice.toString(),
      simSqrtPriceAfter: simPool.sqrtPrice.toString(),
      chainQuoteReserve: snap.quoteReserve.toString(),
      simQuoteReserve: simPool.quoteReserve.toString(),
      chainFees: { partnerQuote: snap.partnerQuote.toString(), creatorQuote: snap.creatorQuote.toString(), protocolQuote: snap.protocolQuote.toString() },
      simFees: { partnerQuote: simPool.partnerQuoteFee.toString(), creatorQuote: simPool.creatorQuoteFee.toString(), protocolQuote: simPool.protocolQuoteFee.toString() },
      chainIncludedIn: "", // filled below from the pool's reserve delta (fee-excluded) + fees
      simIncludedIn: simRes.includedFeeInput.toString(),
    };
    state.buys.push(rec);
    saveState(state);
    const ok = rec.chainBaseOut === rec.simBaseOut && rec.chainSqrtPriceAfter === rec.simSqrtPriceAfter;
    console.log(
      `buy #${i} ${step.mode} ${Number(step.lamports) / 1e9} SOL -> chain ${chainOut} | sim ${simRes.baseOut} | sdk ${sdkQuote.outputAmount} | ${ok ? "MATCH" : "DIFF"} | ${explorerTx(res.sig)}`,
    );
    if (step.pauseMs) await sleep(step.pauseMs);
  }

  const final = await readPoolSnapshot(client, pool);
  if (final.quoteReserve >= sim.migrationQuoteThreshold) {
    state.curveCompleteAt = new Date().toISOString();
    console.log("curve complete: quote reserve", final.quoteReserve.toString());
  }
  saveState(state);
}

// ------------------------------------------------------------------------------------------------
// stage: migrate
// ------------------------------------------------------------------------------------------------
async function stageMigrate(state: RunState): Promise<void> {
  if (state.migration) return console.log("migrate: already done");
  if (!state.curveCompleteAt || !state.pool || !state.config) throw new Error("curve is not complete yet");
  const conn = connect();
  const payer = loadPayer();
  await requireBalance(conn, payer, 0.1);
  const client = DynamicBondingCurveClient.create(conn, COMMITMENT);
  const pool = new PublicKey(state.pool.address);
  const cfg = await client.state.getPoolConfig(new PublicKey(state.config.address));
  if (!cfg) throw new Error("config not found");
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[cfg.migrationFeeOption];
  if (!dammConfig) throw new Error(`no DAMM v2 config for migrationFeeOption ${cfg.migrationFeeOption}`);

  const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } = await client.migration.migrateToDammV2({
    payer: payer.publicKey,
    pool,
    dammConfig,
  });
  const res = await sendTx(conn, transaction, [payer, firstPositionNftKeypair, secondPositionNftKeypair], "migrateToDammV2");
  console.log("migrated to DAMM v2", explorerTx(res.sig));

  const { deriveDammV2PoolAddress } = await import("@meteora-ag/dynamic-bonding-curve-sdk");
  const poolAcc = await client.state.getPool(pool);
  if (!poolAcc) throw new Error("pool missing");
  const dammPool = deriveDammV2PoolAddress(dammConfig, poolAcc.poolState.baseMint, NATIVE_MINT);

  state.migration = {
    tx: toRecord("migration_damm_v2", res),
    dammPool: dammPool.toBase58(),
    dammConfig: dammConfig.toBase58(),
    firstPositionNft: firstPositionNftKeypair.publicKey.toBase58(),
    secondPositionNft: secondPositionNftKeypair.publicKey.toBase58(),
    simMigrationSqrtPrice: bnToBig(cfg.migrationSqrtPrice).toString(),
  };
  saveState(state);

  // read the DAMM v2 pool to compare its opening price with the DBC migration price
  try {
    const { CpAmm } = await import("@meteora-ag/cp-amm-sdk");
    const cpAmm = new CpAmm(conn);
    const dammState = await withRetry("fetchPoolState", () => cpAmm.fetchPoolState(dammPool));
    state.migration.dammSqrtPrice = dammState.sqrtPrice.toString();
    state.migration.dammLiquidity = dammState.liquidity.toString();
    console.log("DAMM v2 pool sqrtPrice", state.migration.dammSqrtPrice, "vs DBC migration sqrtPrice", state.migration.simMigrationSqrtPrice);
  } catch (e) {
    (state.notes ??= []).push(`DAMM v2 pool read failed: ${(e as Error).message}`);
  }
  saveState(state);
}

// ------------------------------------------------------------------------------------------------
const stage = process.argv[2] ?? "all";
const state = loadState();
console.log("key file:", KEY_PATH);
try {
  if (stage === "config" || stage === "all") await stageConfig(state);
  if (stage === "pool" || stage === "all") await stagePool(state);
  if (stage === "buys" || stage === "all") await stageBuys(state);
  if (stage === "migrate" || stage === "all") await stageMigrate(state);
  console.log("explorer:", state.pool ? explorerAddr(state.pool.address) : "(no pool yet)");
} catch (e) {
  saveState(state);
  console.error("STAGE FAILED:", (e as Error).message);
  process.exitCode = 1;
}
