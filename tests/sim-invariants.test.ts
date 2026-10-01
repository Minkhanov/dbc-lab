import { describe, expect, it } from "vitest";
import { PRESETS, getPreset } from "../src/presets/library.js";
import { buildLaunch, validateSpec } from "../src/presets/build.js";
import { buy, initPool, isCurveComplete } from "../src/sim/pool.js";
import { baseFeeNumerator, baseFeeNumeratorByPeriod, includedFeeAmount, excludedFeeAmount } from "../src/sim/fees.js";
import { expandScenario, runScenario } from "../src/sim/scenario.js";
import { migrationOutcome } from "../src/sim/migration.js";
import { keeperCompatibility } from "../src/sim/keeper.js";
import { mulberry32 } from "./helpers.js";

describe("fee scheduler", () => {
  const { sim } = buildLaunch(getPreset("classic-meme")); // exponential 50% -> 1% over 30 periods of 10 s
  it("starts at the cliff fee, ends at the configured minimum, never increases", () => {
    const f0 = baseFeeNumerator(sim.baseFee, 0n, 0n);
    expect(f0).toBe(sim.baseFee.cliffFeeNumerator);
    let prev = f0;
    for (let t = 0n; t <= 400n; t += 5n) {
      const f = baseFeeNumerator(sim.baseFee, t, 0n);
      expect(f <= prev).toBe(true);
      prev = f;
    }
    // after all periods: ~1% (100 bps = 10_000_000). The SDK floors the per-period reduction factor to whole bps,
    // so the effective ending fee can sit slightly off the requested one (here 1.0019%).
    expect(Number(prev)).toBeGreaterThan(9_900_000);
    expect(Number(prev)).toBeLessThan(10_100_000);
  });
  it("is clamped after numberOfPeriod", () => {
    expect(baseFeeNumeratorByPeriod(sim.baseFee, 30n)).toBe(baseFeeNumeratorByPeriod(sim.baseFee, 10_000n));
  });
  it("included/excluded fee amounts are consistent (round trip is off by at most 1 unit)", () => {
    const rand = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const num = BigInt(2_500_000 + Math.floor(rand() * 400_000_000));
      const amount = BigInt(1 + Math.floor(rand() * 1e12));
      const [excl, fee] = excludedFeeAmount(num, amount);
      expect(excl + fee).toBe(amount);
      const [incl] = includedFeeAmount(num, excl);
      expect(incl >= amount - 1n && incl <= amount + 1n).toBe(true);
    }
  });
});

describe("pool invariants", () => {
  for (const preset of PRESETS) {
    it(`${preset.id}: price monotone, quote conserved, graduation lands on the migration price`, () => {
      const { sim } = buildLaunch(preset);
      const pool = initPool(sim, 5_000n);
      const rand = mulberry32(preset.id.length * 31 + 7);
      let paidTotal = 0n;
      let lastPrice = pool.sqrtPrice;
      let t = 0;
      let guard = 0;
      while (!isCurveComplete(sim, pool) && guard++ < 1000) {
        const amt = BigInt(Math.max(1, Math.floor(Number(sim.migrationQuoteThreshold) * (0.001 + rand() * 0.2))));
        t += Math.floor(rand() * 30);
        const r = buy(sim, pool, amt, "partialFill", 5_000n + BigInt(t), 5_000n + BigInt(t));
        expect(r.includedFeeInput + r.refund).toBe(amt);
        expect(r.sqrtPriceAfter >= lastPrice).toBe(true);
        lastPrice = r.sqrtPriceAfter;
        paidTotal += r.includedFeeInput;
        if (!r.completed) expect(r.refund).toBe(0n);
      }
      expect(isCurveComplete(sim, pool)).toBe(true);
      // quote-side conservation: everything paid is either curve reserve or a fee
      const fees = pool.partnerQuoteFee + pool.creatorQuoteFee + pool.protocolQuoteFee;
      expect(paidTotal).toBe(pool.quoteReserve + fees);
      // the final partial fill stops exactly at the derived migration price
      expect(pool.sqrtPrice).toBe(sim.migrationSqrtPrice);
      // protocol takes ~20% of the total fee (floor rounding per trade)
      expect(Number(pool.protocolQuoteFee) / Number(fees)).toBeGreaterThan(0.19);
      expect(Number(pool.protocolQuoteFee) / Number(fees)).toBeLessThan(0.2001);
      // creator share of the non-protocol fee follows the config (within per-trade floor rounding)
      const lpFee = pool.partnerQuoteFee + pool.creatorQuoteFee;
      const expectedCreator = (Number(lpFee) * sim.creatorTradingFeePercentage) / 100;
      expect(Math.abs(Number(pool.creatorQuoteFee) - expectedCreator)).toBeLessThanOrEqual(guard + 1);
    });
  }

  it("a swap after graduation is rejected", () => {
    const { sim } = buildLaunch(getPreset("devnet-micro"));
    const pool = initPool(sim, 0n);
    buy(sim, pool, sim.migrationQuoteThreshold * 2n, "partialFill", 0n, 0n);
    expect(isCurveComplete(sim, pool)).toBe(true);
    expect(() => buy(sim, pool, 1000n, "partialFill", 1n, 1n)).toThrow(/completed/);
  });

  it("exactIn that would cross the threshold throws (the program answers Insufficient Liquidity)", () => {
    const { sim } = buildLaunch(getPreset("devnet-micro"));
    const pool = initPool(sim, 0n);
    expect(() => buy(sim, pool, sim.migrationQuoteThreshold * 2n, "exactIn", 0n, 0n)).toThrow(/Insufficient/);
  });
});

describe("scenarios", () => {
  const spec = getPreset("classic-meme");
  const { sim } = buildLaunch(spec);
  it("sniper at t=0 pays the starting fee, organic buyers later pay much less", () => {
    const rep = runScenario(
      sim,
      expandScenario({ kind: "sniperThenOrganic", sniperQuote: 0.5, sniperAtSec: 0, organicTrades: 5, organicQuoteEach: 0.5, organicStartSec: 400, organicIntervalSec: 10 }),
      { supply: spec.token.supply },
    );
    expect(rep.trades[0]!.feePercent).toBeGreaterThan(49);
    expect(rep.trades[1]!.feePercent).toBeLessThan(2);
    expect(rep.trades[0]!.label).toBe("sniper");
  });
  it("even scenario graduates and reports consistent totals", () => {
    const rep = runScenario(sim, expandScenario({ kind: "even", trades: 60, totalQuote: 14, intervalSec: 20 }), { supply: spec.token.supply });
    expect(rep.graduated).toBe(true);
    expect(rep.migrationPrice / rep.startPrice).toBeGreaterThan(15.9);
    expect(rep.migrationPrice / rep.startPrice).toBeLessThan(16.1);
    expect(rep.fees.partnerQuote + rep.fees.creatorQuote + rep.fees.protocolQuote).toBeCloseTo(rep.fees.totalQuote, 9);
    expect(rep.skippedAfterGraduation).toBeGreaterThan(0);
  });
});

describe("migration outcome", () => {
  it("fee-less config: pool opens with the full threshold less the 0.2% protocol fee", () => {
    const { sim } = buildLaunch(getPreset("classic-meme"));
    const m = migrationOutcome(sim);
    expect(m.migrationFee).toBe(0n);
    expect(m.quoteIncludedProtocolFee).toBe(sim.migrationQuoteThreshold);
    expect(m.poolQuote).toBe(sim.migrationQuoteThreshold - (sim.migrationQuoteThreshold * 20n) / 10_000n);
  });
  it("2% migration fee is split 50/50", () => {
    const { sim } = buildLaunch(getPreset("long-curve"));
    const m = migrationOutcome(sim);
    expect(m.migrationFee).toBe(sim.migrationQuoteThreshold - m.quoteIncludedProtocolFee);
    expect(m.creatorMigrationFee + m.partnerMigrationFee).toBe(m.migrationFee);
    expect(Number(m.migrationFee) / Number(sim.migrationQuoteThreshold)).toBeCloseTo(0.02, 4);
  });
});

describe("keeper compatibility", () => {
  it("10 SOL is eligible, 0.2 SOL is not, unknown quote is flagged", () => {
    expect(keeperCompatibility(buildLaunch(getPreset("classic-meme")).sim, "SOL").eligible).toBe(true);
    expect(keeperCompatibility(buildLaunch(getPreset("devnet-micro")).sim, "SOL").eligible).toBe(false);
    expect(keeperCompatibility(buildLaunch(getPreset("stock-pair-usdc")).sim, "USDC").eligible).toBe(true);
    expect(keeperCompatibility(buildLaunch(getPreset("classic-meme")).sim, "XYZ").eligible).toBe("unknown");
  });
});

describe("spec validation", () => {
  it("every shipped preset is valid", () => {
    for (const p of PRESETS) expect(validateSpec(p), p.id).toEqual([]);
  });
  it("rejects <10% locked liquidity, bad fee ranges and non-integer periods", () => {
    const s = getPreset("classic-meme");
    s.liquidity = { partnerPercent: 100, partnerPermanentLockedPercent: 0, creatorPercent: 0, creatorPermanentLockedPercent: 0 };
    expect(validateSpec(s).join()).toMatch(/locked/);
    const f = getPreset("classic-meme");
    f.fee.endingBps = 10;
    expect(validateSpec(f).join()).toMatch(/25/);
    const p = getPreset("classic-meme");
    p.fee.numberOfPeriod = 7;
    p.fee.totalDuration = 300;
    expect(validateSpec(p).join()).toMatch(/divisible/);
  });
});
