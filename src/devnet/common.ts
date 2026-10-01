/** Devnet plumbing: keypair, RPC with retries, transaction sending, explorer links, run-state file. */
import { Connection, Keypair, Transaction, type Commitment } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

export const DEVNET_RPC = process.env.DEVNET_RPC ?? "https://api.devnet.solana.com";
export const COMMITMENT = "confirmed" as const satisfies Commitment;
export const ROOT = path.resolve(import.meta.dirname, "..", "..");
export const KEY_PATH = path.join(ROOT, "keys", "devnet-test.json");
export const RUN_DIR = path.join(ROOT, "devnet-run");
export const STATE_PATH = path.join(RUN_DIR, "state.json");

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function loadPayer(): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEY_PATH, "utf8"))));
}

export function connect(): Connection {
  return new Connection(DEVNET_RPC, { commitment: COMMITMENT, confirmTransactionInitialTimeout: 60_000 });
}

export function explorerTx(sig: string): string {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}
export function explorerAddr(addr: string): string {
  return `https://explorer.solana.com/address/${addr}?cluster=devnet`;
}
export function solscanTx(sig: string): string {
  return `https://solscan.io/tx/${sig}?cluster=devnet`;
}

/** Retry a network call with exponential backoff (429, timeouts, socket resets). */
export async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 6): Promise<T> {
  let last: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = String((e as Error)?.message ?? e);
      const transient = /429|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed|socket|503|502|504|blockhash not found|Blockhash not found|node is behind|Too Many Requests/i.test(msg);
      if (!transient || i === attempts) break;
      const wait = Math.min(15_000, 800 * 2 ** i);
      console.log(`  [retry ${i}/${attempts}] ${label}: ${msg.slice(0, 120)} (wait ${wait} ms)`);
      await sleep(wait);
    }
  }
  throw last;
}

/** Sign, send and confirm a legacy transaction. Re-fetches the blockhash on every attempt. */
export async function sendTx(conn: Connection, tx: Transaction, signers: Keypair[], label: string): Promise<{ sig: string; slot: number; blockTime: number | null }> {
  const first = signers[0];
  if (!first) throw new Error("no signers");
  tx.feePayer = first.publicKey;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const { blockhash, lastValidBlockHeight } = await withRetry("getLatestBlockhash", () => conn.getLatestBlockhash(COMMITMENT));
      tx.recentBlockhash = blockhash;
      tx.signatures = [];
      tx.sign(...signers);
      const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3, preflightCommitment: COMMITMENT });
      const res = await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, COMMITMENT);
      if (res.value.err) throw new Error(`${label}: transaction failed on chain: ${JSON.stringify(res.value.err)}`);
      const info = await withRetry("getTransaction", async () => {
        const t = await conn.getTransaction(sig, { commitment: COMMITMENT, maxSupportedTransactionVersion: 0 });
        if (!t) throw new Error("timeout: transaction not yet indexed");
        return t;
      });
      return { sig, slot: info.slot, blockTime: info.blockTime ?? null };
    } catch (e) {
      lastErr = e;
      const msg = String((e as Error)?.message ?? e);
      const transient = /429|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed|socket|503|502|504|blockhash not found|Blockhash not found|block height exceeded|TransactionExpiredBlockheightExceeded/i.test(msg);
      if (!transient) {
        // surface program logs for debugging
        const logs = (e as { logs?: string[] }).logs;
        if (logs) console.log(logs.join("\n"));
        throw e;
      }
      console.log(`  [send retry ${attempt}/5] ${label}: ${msg.slice(0, 140)}`);
      await sleep(1500 * attempt);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------------------------
// run-state (public data only: addresses, signatures, numbers). Never contains secrets.
// ---------------------------------------------------------------------------------------------

export interface TxRecord {
  label: string;
  sig: string;
  slot: number;
  blockTime: number | null;
}

export interface BuyRecord {
  index: number;
  mode: "exactIn" | "partialFill";
  amountInLamports: string;
  tx: TxRecord;
  /** unix seconds used for the sim step (block time of the tx) */
  point: number;
  sdkQuoteBaseOut: string;
  simBaseOut: string;
  chainBaseOut: string;
  sdkQuoteFeeNumerator?: string;
  simFeeNumerator: string;
  chainSqrtPriceAfter: string;
  simSqrtPriceAfter: string;
  chainQuoteReserve: string;
  simQuoteReserve: string;
  chainFees: { partnerQuote: string; creatorQuote: string; protocolQuote: string };
  simFees: { partnerQuote: string; creatorQuote: string; protocolQuote: string };
  chainIncludedIn: string;
  simIncludedIn: string;
}

export interface RunState {
  startedAt?: string;
  payer?: string;
  presetId?: string;
  config?: { address: string; tx: TxRecord };
  configCheck?: Record<string, { chain: string; sim: string; equal: boolean }>;
  baseMint?: string;
  pool?: { address: string; activationPoint: string; tx: TxRecord };
  buys?: BuyRecord[];
  curveCompleteAt?: string;
  migration?: {
    tx: TxRecord;
    dammPool: string;
    dammConfig: string;
    firstPositionNft: string;
    secondPositionNft: string;
    dammSqrtPrice?: string;
    simMigrationSqrtPrice?: string;
    dammLiquidity?: string;
  };
  claims?: TxRecord[];
  notes?: string[];
}

export function loadState(): RunState {
  if (!fs.existsSync(STATE_PATH)) return {};
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8")) as RunState;
}
export function saveState(s: RunState): void {
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}
