/**
 * No-SOL validation of every preset against the REAL deployed DBC program on devnet.
 *
 * We build the `create_config` transaction with the official SDK, set an arbitrary funded devnet
 * system account as (unsigned) fee payer and call `simulateTransaction` with sigVerify off.
 * Nothing is sent, nothing is signed, no funds can move. The simulation returns the post-state of the
 * new config account, which we decode and compare with what our simulator derived on its own
 * (migration sqrt price, swap base amount, migration base threshold).
 *
 * The "payer" below is just a public address that happens to hold devnet SOL (the program upgrade authority).
 */
import fs from "node:fs";
import path from "node:path";
import { NATIVE_MINT } from "@solana/spl-token";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient, createDbcProgram } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { PRESETS } from "../src/presets/library.js";
import { buildLaunch } from "../src/presets/build.js";
import { migrationOutcome } from "../src/sim/migration.js";
import { baseTokenForSwap } from "../src/sim/curve.js";

const PAYER = new PublicKey(process.env.SIM_PAYER ?? "DHLXnJdACTY83yKwnUkeoDjqi4QBbsYGa1v8tJL76ViX");
const conn = new Connection(process.env.DEVNET_RPC ?? "https://api.devnet.solana.com", "confirmed");
const client = DynamicBondingCurveClient.create(conn, "confirmed");
const { program } = createDbcProgram(conn, "confirmed");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const lines: string[] = [];
const say = (m: string) => {
  console.log(m);
  lines.push(m);
};
for (const preset of PRESETS) {
  const { params, sim } = buildLaunch(preset);
  const config = Keypair.generate().publicKey;
  const tx = await client.partner.createConfig({
    config,
    feeClaimer: PAYER,
    leftoverReceiver: PAYER,
    payer: PAYER,
    quoteMint: NATIVE_MINT,
    ...params,
  });
  tx.feePayer = PAYER;
  let res;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      res = await conn.simulateTransaction(tx, undefined, [config]);
      break;
    } catch (e) {
      console.log(`  retry ${attempt}: ${(e as Error).message.slice(0, 100)}`);
      await sleep(2000 * attempt);
    }
  }
  if (!res) {
    say(`${preset.id}: SIMULATION UNAVAILABLE`);
    failures++;
    continue;
  }
  if (res.value.err) {
    say(`${preset.id}: PROGRAM REJECTED CONFIG ${JSON.stringify(res.value.err)}`);
    console.log((res.value.logs ?? []).slice(-6).join("\n"));
    failures++;
    continue;
  }
  const data = Buffer.from(res.value.accounts![0]!.data[0] as string, "base64");
  const acc = program.coder.accounts.decode("poolConfig", data);
  const mig = migrationOutcome(sim);
  const checks: [string, bigint, bigint][] = [
    ["migrationSqrtPrice", BigInt(acc.migrationSqrtPrice.toString()), sim.migrationSqrtPrice],
    ["migrationQuoteThreshold", BigInt(acc.migrationQuoteThreshold.toString()), sim.migrationQuoteThreshold],
    ["swapBaseAmount", BigInt(acc.swapBaseAmount.toString()), baseTokenForSwap(sim.sqrtStartPrice, sim.migrationSqrtPrice, sim.curve)],
    ["migrationBaseThreshold", BigInt(acc.migrationBaseThreshold.toString()), mig.baseIncludedProtocolFee],
  ];
  const bad = checks.filter(([, a, b]) => a !== b);
  say(`${preset.id}: program accepted config; ` + (bad.length ? `MISMATCH ${bad.map(([n, a, b]) => `${n} chain=${a} sim=${b}`).join("; ")}` : `all ${checks.length} derived values equal the simulator`));
  if (bad.length) failures++;
  await sleep(1200);
}
fs.mkdirSync(path.resolve("devnet-run"), { recursive: true });
const header = new Date().toISOString() + "  fee payer (unsigned, simulation only) = " + PAYER.toBase58();
fs.writeFileSync(path.resolve("devnet-run", "dryrun-config.txt"), [header, ...lines].join(String.fromCharCode(10)) + String.fromCharCode(10));
process.exitCode = failures ? 1 : 0;
