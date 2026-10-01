#!/usr/bin/env node
/**
 * dbc-lab CLI.
 *   dbc-lab list
 *   dbc-lab show <preset|file.json>
 *   dbc-lab validate <preset|file.json>
 *   dbc-lab sim <preset|file.json> [--scenario even|sniper|whale] [--trades N] [--quote TOTAL] [--interval SEC] [--json]
 *   dbc-lab export <preset|file.json> [--out DIR]
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { PRESETS, getPreset } from "../presets/library.js";
import { buildLaunch, validateSpec } from "../presets/build.js";
import { configToJson } from "../presets/serialize.js";
import type { LaunchSpec } from "../presets/spec.js";
import { expandScenario, runScenario, type ScenarioSpec, type SimReport } from "../sim/scenario.js";
import { keeperCompatibility } from "../sim/keeper.js";
import { renderExportSnippet } from "../presets/exportSnippet.js";

function loadSpec(arg: string | undefined): LaunchSpec {
  if (!arg) throw new Error("preset id or spec file required");
  if (arg.endsWith(".json") && fs.existsSync(arg)) return JSON.parse(fs.readFileSync(arg, "utf8")) as LaunchSpec;
  return getPreset(arg);
}

const fmt = (x: number, d = 4) => (Math.abs(x) >= 1000 ? x.toFixed(2) : Math.abs(x) >= 1 ? x.toFixed(d) : x.toPrecision(4));

function printReport(spec: LaunchSpec, r: SimReport): void {
  const q = spec.quote.symbol;
  console.log(`\n${spec.name}  [${spec.id}]`);
  console.log(`start price ${fmt(r.startPrice)} ${q}/token   migration price ${fmt(r.migrationPrice)} ${q}/token   (x${(r.migrationPrice / r.startPrice).toFixed(1)})`);
  if (r.startMarketCap !== null && r.migrationMarketCap !== null) {
    console.log(`market cap  ${fmt(r.startMarketCap)} -> ${fmt(r.migrationMarketCap)} ${q}   graduation threshold ${fmt(r.thresholdQuote)} ${q} (fee-excluded)`);
  }
  console.log("\n #   t(s)  paid       fee%   tokens out        price after     raised/thr");
  for (const t of r.trades) {
    console.log(
      `${String(t.index).padStart(2)}  ${String(t.atSec).padStart(5)}  ${fmt(t.paidQuote).padStart(9)}  ${t.feePercent.toFixed(2).padStart(5)}  ${t.baseOut.toFixed(2).padStart(15)}  ${fmt(t.priceAfter).padStart(14)}  ${t.progressPercent.toFixed(1).padStart(6)}%${t.refundQuote > 0 ? `  (refund ${fmt(t.refundQuote)})` : ""}${t.label ? `  ${t.label}` : ""}`,
    );
  }
  console.log("");
  console.log(r.graduated ? `GRADUATED at t=${r.graduationAtSec}s after ${r.trades.length} trades` : `not graduated (${r.trades.at(-1)?.progressPercent.toFixed(1) ?? 0}% of threshold)`);
  if (r.skippedAfterGraduation) console.log(`${r.skippedAfterGraduation} scheduled buys skipped (curve already complete)`);
  console.log(`buyers paid ${fmt(r.buyersPaidQuote)} ${q}; trading fees ${fmt(r.fees.totalQuote)} ${q} (${r.fees.avgPercentOfPaid.toFixed(2)}% of paid)`);
  console.log(`  partner ${fmt(r.fees.partnerQuote)}  creator ${fmt(r.fees.creatorQuote)}  protocol ${fmt(r.fees.protocolQuote)}`);
  if (r.graduated) {
    console.log(`migration fee ${fmt(r.migration.migrationFeeQuote)} ${q} (creator ${fmt(r.migration.creatorMigrationFeeQuote)}, partner ${fmt(r.migration.partnerMigrationFeeQuote)})`);
    console.log(`DAMM v2 opens at ${fmt(r.migration.damm2OpeningPrice)} ${q}/token with ${fmt(r.migration.damm2PoolQuote)} ${q} + ${fmt(r.migration.damm2PoolBase, 2)} tokens`);
  }
  console.log(`income: creator ${fmt(r.income.creatorQuote)} ${q}, partner ${fmt(r.income.partnerQuote)} ${q}, protocol ${fmt(r.income.protocolQuote)} ${q}`);
  console.log(`note: ${r.income.note}`);
}

function scenarioFromArgs(values: Record<string, string | boolean | undefined>, thresholdQuote: number, quoteDecimals: number): ScenarioSpec {
  const kind = (values.scenario as string | undefined) ?? "even";
  const trades = Number(values.trades ?? 40);
  const interval = Number(values.interval ?? 20);
  // default: buyers bring 1.15x the threshold so the curve graduates despite fees
  const total = Number(values.quote ?? thresholdQuote * 1.15);
  const each = total / trades;
  void quoteDecimals;
  if (kind === "even") return { kind: "even", trades, totalQuote: total, intervalSec: interval };
  if (kind === "sniper")
    return {
      kind: "sniperThenOrganic",
      sniperQuote: thresholdQuote * 0.05,
      sniperAtSec: 0,
      organicTrades: trades,
      organicQuoteEach: each,
      organicStartSec: 15,
      organicIntervalSec: interval,
    };
  if (kind === "whale")
    return { kind: "whale", whaleQuote: thresholdQuote * 0.5, whaleAtSec: interval * 5, organicTrades: trades, organicQuoteEach: each * 0.6, organicIntervalSec: interval };
  throw new Error(`unknown scenario "${kind}" (even|sniper|whale)`);
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    scenario: { type: "string" },
    trades: { type: "string" },
    quote: { type: "string" },
    interval: { type: "string" },
    out: { type: "string" },
    json: { type: "boolean" },
  },
});

const [cmd, target] = positionals;
try {
  switch (cmd) {
    case "list": {
      for (const p of PRESETS) console.log(`${p.id.padEnd(18)} ${p.name}\n${"".padEnd(19)}${p.tags.join(", ")}`);
      break;
    }
    case "show": {
      console.log(JSON.stringify(loadSpec(target), null, 2));
      break;
    }
    case "validate": {
      const spec = loadSpec(target);
      const errs = validateSpec(spec);
      if (errs.length) {
        console.log(`INVALID:\n - ${errs.join("\n - ")}`);
        process.exitCode = 1;
        break;
      }
      const { sim } = buildLaunch(spec); // throws if the SDK builder rejects the parameters
      const k = keeperCompatibility(sim, spec.quote.symbol);
      console.log(`valid. migration threshold ${Number(sim.migrationQuoteThreshold) / 10 ** sim.quoteDecimals} ${spec.quote.symbol}`);
      console.log(`mainnet migration keepers: ${k.verdict}`);
      break;
    }
    case "sim": {
      const spec = loadSpec(target);
      const { sim } = buildLaunch(spec);
      const thr = Number(sim.migrationQuoteThreshold) / 10 ** sim.quoteDecimals;
      const scen = scenarioFromArgs(values as never, thr, sim.quoteDecimals);
      const report = runScenario(sim, expandScenario(scen), { supply: spec.token.supply });
      if (values.json) console.log(JSON.stringify(report, null, 2));
      else printReport(spec, report);
      break;
    }
    case "export": {
      const spec = loadSpec(target);
      const { params } = buildLaunch(spec);
      const dir = path.resolve(values.out ?? "exports", spec.id);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "spec.json"), JSON.stringify(spec, null, 2));
      fs.writeFileSync(path.join(dir, "config-parameters.json"), configToJson(params));
      fs.writeFileSync(path.join(dir, "create-config.ts"), renderExportSnippet(spec));
      console.log(`exported to ${dir}\n  spec.json  config-parameters.json  create-config.ts`);
      break;
    }
    default:
      console.log("usage: dbc-lab <list|show|validate|sim|export> [preset|file.json] [options]");
      process.exitCode = cmd ? 1 : 0;
  }
} catch (e) {
  console.error("error:", (e as Error).message);
  process.exitCode = 1;
}
