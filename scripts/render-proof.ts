/**
 * Renders DEVNET-PROOF.md from devnet-run/state.json (own pool run) and devnet-run/conformance.json (real-pool conformance).
 * Usage: tsx scripts/render-proof.ts
 */
import fs from "node:fs";
import path from "node:path";
import { explorerAddr, explorerTx, loadState, solscanTx } from "../src/devnet/common.js";

const root = path.resolve(import.meta.dirname, "..");
const state = loadState();
const confPath = path.join(root, "devnet-run", "conformance.json");
const conf = fs.existsSync(confPath) ? (JSON.parse(fs.readFileSync(confPath, "utf8")) as { summary: Record<string, unknown>; records: any[] }) : null;
const dryPath = path.join(root, "devnet-run", "dryrun-config.txt");
const dry = fs.existsSync(dryPath) ? fs.readFileSync(dryPath, "utf8").trim() : null;

const L: string[] = [];
const push = (s = "") => L.push(s);

push("# DEVNET-PROOF");
push();
push("Everything here happened on **Solana devnet**. No mainnet transaction was sent, no real wallet was used.");
push("The only key is a throw-away devnet keypair that lives outside git (`keys/`, ignored). Programs are the real deployed ones:");
push("DBC `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`, DAMM v2 `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`.");
push();
push(`Generated: ${new Date().toISOString()}`);
push();

push("## A. Own launch: config -> pool -> buys -> migration to DAMM v2");
push();
if (!state.config) {
  push("**Status: NOT EXECUTED YET.** The throw-away devnet wallet could not be funded: the public faucet (`requestAirdrop` on api.devnet.solana.com) kept answering");
  push("`429 You've either reached your airdrop limit today or the airdrop faucet has run dry`. The runner (`src/devnet/run.ts`) is complete and resumable;");
  push("it runs with `npm run devnet:all` as soon as the wallet holds about 1 devnet SOL. This section is regenerated from `devnet-run/state.json`.");
  push();
  push("Wallet to fund (devnet only, public key): see `keys/` / `STATUS.md`.");
} else {
  push(`Payer / partner / creator / trader (same throw-away wallet): \`${state.payer}\``);
  push(`Preset: \`${state.presetId}\``);
  push();
  push("| Step | Address / signature | Links |");
  push("|---|---|---|");
  push(`| DBC config | \`${state.config.address}\` | [address](${explorerAddr(state.config.address)}) |`);
  push(`| \`create_config\` tx | \`${state.config.tx.sig}\` | [explorer](${explorerTx(state.config.tx.sig)}), [solscan](${solscanTx(state.config.tx.sig)}) |`);
  if (state.pool) {
    push(`| Base mint | \`${state.baseMint}\` | [address](${explorerAddr(state.baseMint!)}) |`);
    push(`| Virtual pool | \`${state.pool.address}\` | [address](${explorerAddr(state.pool.address)}) |`);
    push(`| \`initialize_virtual_pool\` tx | \`${state.pool.tx.sig}\` | [explorer](${explorerTx(state.pool.tx.sig)}) |`);
  }
  for (const b of state.buys ?? []) {
    push(`| buy #${b.index} (${b.mode}, ${Number(b.amountInLamports) / 1e9} SOL) | \`${b.tx.sig}\` | [explorer](${explorerTx(b.tx.sig)}) |`);
  }
  if (state.migration) {
    push(`| \`migration_damm_v2\` tx | \`${state.migration.tx.sig}\` | [explorer](${explorerTx(state.migration.tx.sig)}) |`);
    push(`| DAMM v2 pool | \`${state.migration.dammPool}\` | [address](${explorerAddr(state.migration.dammPool)}) |`);
    push(`| Position NFTs | \`${state.migration.firstPositionNft}\`, \`${state.migration.secondPositionNft}\` | |`);
  }
  push();
  if (state.configCheck) {
    push("### Config values derived by the program vs the simulator");
    push();
    push("| field | on chain | simulator | equal |");
    push("|---|---|---|---|");
    for (const [k, v] of Object.entries(state.configCheck)) push(`| ${k} | ${v.chain} | ${v.sim} | ${v.equal ? "yes" : "NO"} |`);
    push();
  }
  if (state.buys?.length) {
    push("### Simulator vs chain, trade by trade");
    push();
    push("`chain` = tokens actually received (change of the buyer's token account); `sdk` = SDK `swapQuote2` taken just before sending; `sim` = this repo's simulator replayed at the on-chain block time of the transaction.");
    push();
    push("| # | mode | in (SOL) | chain out | sdk quote | sim out | sqrt price equal | reserve equal | fee accumulators equal |");
    push("|---|---|---|---|---|---|---|---|---|");
    for (const b of state.buys) {
      const feeEq = JSON.stringify(b.chainFees) === JSON.stringify(b.simFees);
      push(
        `| ${b.index} | ${b.mode} | ${Number(b.amountInLamports) / 1e9} | ${b.chainBaseOut} | ${b.sdkQuoteBaseOut} | ${b.simBaseOut} | ${b.chainSqrtPriceAfter === b.simSqrtPriceAfter ? "yes" : "NO"} | ${b.chainQuoteReserve === b.simQuoteReserve ? "yes" : "NO"} | ${feeEq ? "yes" : "NO"} |`,
      );
    }
    push();
    const diffs = state.buys.filter((b) => b.chainBaseOut !== b.simBaseOut).length;
    push(`Trades where simulator output differs from the chain: **${diffs} of ${state.buys.length}**.`);
    push();
  }
  if (state.migration?.dammSqrtPrice) {
    push("### Migration result");
    push();
    push(`DAMM v2 pool sqrt price: \`${state.migration.dammSqrtPrice}\``);
    push(`DBC migration sqrt price (from config): \`${state.migration.simMigrationSqrtPrice}\``);
    push(`Equal: **${state.migration.dammSqrtPrice === state.migration.simMigrationSqrtPrice ? "yes" : "no (see note)"}**`);
    push();
  }
  if (state.notes?.length) {
    push("Notes:");
    for (const n of state.notes) push(`- ${n}`);
    push();
  }
}

push("## B. `create_config` of every preset, simulated against the deployed devnet program (no SOL needed)");
push();
push("`scripts/dryrun-config.ts` builds the real `create_config` transaction with the SDK, sets an arbitrary funded devnet system account as UNSIGNED fee payer");
push("and calls `simulateTransaction` (sigVerify off): nothing is sent, nothing is signed, no funds can move. The simulation returns the new config account, which is decoded");
push("and compared with the simulator's own derivations.");
push();
if (dry) {
  push("```");
  push(dry);
  push("```");
} else {
  push("(run `npm run devnet:dryrun` to regenerate)");
}
push();

push("## C. Simulator vs the deployed program on real devnet pools (no SOL needed)");
push();
push("`scripts/conformance-devnet.ts` samples live pools from the 85k DBC pools on devnet (wSOL quote, linear or exponential scheduler), builds a `swap2` buy with the SDK,");
push("simulates it against the deployed program (unsigned, nothing sent) and compares the program's post-state with the simulator replaying the same buy from the pool's pre-state.");
push();
if (conf) {
  const s = conf.summary as Record<string, number | string>;
  push("| metric | value |");
  push("|---|---|");
  for (const k of ["when", "seed", "testedPools", "match", "mismatch", "simError", "chainError", "matchedWithClockShift", "withDynamicFee", "outputTokenMode", "exponentialScheduler", "partialFill"]) {
    push(`| ${k} | ${s[k]} |`);
  }
  push();
  push("Compared per pool: tokens received, sqrt price, quote reserve, partner fee, creator fee, protocol fee (all integers, exact equality required).");
  push();
  const bad = conf.records.filter((r) => r.status !== "match");
  if (bad.length) {
    push("Non-matching or non-simulatable pools:");
    push();
    for (const r of bad) push(`- \`${r.pool}\` ${r.status}: ${r.detail ?? ""}`);
    push();
  }
  push("Pool addresses tested (all on devnet): " + conf.records.map((r) => `\`${r.pool}\``).join(", "));
  push();
} else {
  push("(run `npm run devnet:conformance` to generate)");
  push();
}

fs.writeFileSync(path.join(root, "DEVNET-PROOF.md"), L.join("\n"));
console.log("DEVNET-PROOF.md written");
