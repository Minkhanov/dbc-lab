import { Connection } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const client = DynamicBondingCurveClient.create(conn, "confirmed");
const t0 = Date.now();
try {
  const pools = await client.state.getPools();
  console.log("pools:", pools.length, "in", Date.now() - t0, "ms");
  const live = pools.filter((p) => p.account.poolState.isMigrated === 0 && p.account.poolState.hasSwap === 1);
  console.log("not migrated & has swaps:", live.length);
  const byConfig = new Map<string, number>();
  for (const p of live) byConfig.set(p.account.poolState.config.toBase58(), (byConfig.get(p.account.poolState.config.toBase58()) ?? 0) + 1);
  console.log("distinct configs among live pools:", byConfig.size);
  for (const p of live.slice(0, 12)) {
    const s = p.account.poolState;
    console.log(p.publicKey.toBase58(), "cfg", s.config.toBase58().slice(0, 8), "quoteReserve", s.quoteReserve.toString(), "sqrt", s.sqrtPrice.toString().slice(0, 12));
  }
} catch (e) {
  console.log("ERR", (e as Error).message.slice(0, 300));
}
