// Devnet-only airdrop with retries. Usage: tsx scripts/airdrop.ts [solPerRequest] [requests]
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "node:fs";
import path from "node:path";

const rpc = process.env.DEVNET_RPC ?? "https://api.devnet.solana.com";
const conn = new Connection(rpc, "confirmed");
const kp = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(path.resolve("keys", "devnet-test.json"), "utf8"))),
);
const sol = Number(process.argv[2] ?? 2);
const requests = Number(process.argv[3] ?? 1);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < requests; i++) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const sig = await conn.requestAirdrop(kp.publicKey, Math.round(sol * LAMPORTS_PER_SOL));
      const bh = await conn.getLatestBlockhash();
      await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
      console.log(`airdrop ${i + 1}/${requests} ok:`, sig);
      break;
    } catch (e) {
      console.log(`airdrop ${i + 1} attempt ${attempt} failed:`, String((e as Error).message).slice(0, 200));
      await sleep(3000 * attempt);
    }
  }
}
console.log("balance SOL:", (await conn.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL);
