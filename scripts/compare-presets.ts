/**
 * Same crowd, different curves: runs one scenario family against every preset and prints a markdown table.
 * Scenario: a sniper spends 3% of the graduation threshold at t=0, then organic buyers arrive every 20 s with
 * (1.15 x threshold / 60) each, until the curve graduates (or 60 buys are exhausted).
 *
 * The point of the table is the SHAPE of the trade-offs (who pays what fee, how long graduation takes, who earns),
 * not a forecast of demand.
 */
import { PRESETS } from "../src/presets/library.js";
import { buildLaunch } from "../src/presets/build.js";
import { expandScenario, runScenario } from "../src/sim/scenario.js";

const rows: string[] = [];
rows.push("| preset | threshold | sniper fee at t=0 | sniper tokens per 1 quote vs 1st organic buyer | fee paid by organic buyers (avg) | graduation after | creator income | partner income |");
rows.push("|---|---|---|---|---|---|---|---|");
for (const spec of PRESETS) {
  const { sim } = buildLaunch(spec);
  const thr = Number(sim.migrationQuoteThreshold) / 10 ** sim.quoteDecimals;
  const rep = runScenario(
    sim,
    expandScenario({
      kind: "sniperThenOrganic",
      sniperQuote: thr * 0.03,
      sniperAtSec: 0,
      organicTrades: 60,
      organicQuoteEach: (thr * 1.15) / 60,
      organicStartSec: 20,
      organicIntervalSec: 20,
    }),
    { supply: spec.token.supply },
  );
  const sniper = rep.trades[0]!;
  const org = rep.trades.slice(1);
  const first = org[0]!;
  const sniperRate = sniper.baseOut / sniper.paidQuote;
  const orgRate = first.baseOut / first.paidQuote;
  const avgOrgFee = org.reduce((a, t) => a + t.feePercent, 0) / Math.max(1, org.length);
  const q = spec.quote.symbol;
  rows.push(
    `| ${spec.id} | ${thr} ${q} | ${sniper.feePercent.toFixed(2)}% | ${(sniperRate / orgRate).toFixed(2)}x | ${avgOrgFee.toFixed(2)}% | ${rep.graduated ? Math.round(rep.graduationAtSec! / 60) + " min" : "not within 20 min"} | ${rep.income.creatorQuote.toFixed(4)} ${q} | ${rep.income.partnerQuote.toFixed(4)} ${q} |`,
  );
}
console.log(rows.join("\n"));
