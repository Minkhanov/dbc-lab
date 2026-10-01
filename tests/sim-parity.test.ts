import { describe, expect, it } from "vitest";
import {
  getBaseTokenForSwap,
  getMigrationThresholdPrice,
  swapQuoteExactIn,
  swapQuotePartialFill,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { PRESETS } from "../src/presets/library.js";
import { buildLaunch } from "../src/presets/build.js";
import { buy, initPool, isCurveComplete, pointAt } from "../src/sim/pool.js";
import { baseTokenForSwap } from "../src/sim/curve.js";
import { baseFeeNumerator } from "../src/sim/fees.js";
import { bn, mulberry32, sdkViews } from "./helpers.js";

describe("curve derivation matches the SDK", () => {
  for (const preset of PRESETS) {
    it(`${preset.id}: migration price and swap base amount`, () => {
      const { params, sim } = buildLaunch(preset);
      const sdkCurve = (params as any).curve;
      const sdkMig = getMigrationThresholdPrice(bn(sim.migrationQuoteThreshold), bn(sim.sqrtStartPrice), sdkCurve);
      expect(sim.migrationSqrtPrice.toString()).toBe(sdkMig.toString());
      const sdkBase = getBaseTokenForSwap(bn(sim.sqrtStartPrice), sdkMig, sdkCurve);
      expect(baseTokenForSwap(sim.sqrtStartPrice, sim.migrationSqrtPrice, sim.curve).toString()).toBe(sdkBase.toString());
    });
  }
});

describe("buy path matches SDK swapQuote (random sequences until graduation)", () => {
  for (const preset of PRESETS) {
    it(`${preset.id}`, () => {
      const { params, sim } = buildLaunch(preset);
      const rand = mulberry32(preset.id.length * 7919);
      const pool = initPool(sim, 1_000n);
      let t = 0;
      let trades = 0;
      let sawDynamicSurcharge = false;
      while (!isCurveComplete(sim, pool) && trades < 400) {
        // quote amount between 0.2% and 12% of the threshold, so the curve fills in a few dozen trades
        const frac = 0.002 + rand() * 0.12;
        const amountIn = BigInt(Math.max(1, Math.floor(Number(sim.migrationQuoteThreshold) * frac)));
        t += Math.floor(rand() * 40);
        const point = pointAt(sim, pool.activationPoint, t);
        const nowTs = pool.activationPoint + BigInt(t);
        const { config, virtualPool } = sdkViews(sim, params, pool);
        // use partial fill when the trade could cross the threshold, like a real UI would
        const remaining = sim.migrationQuoteThreshold - pool.quoteReserve;
        const mode = amountIn * 2n > remaining ? "partialFill" : "exactIn";
        const sdkQuote =
          mode === "exactIn"
            ? swapQuoteExactIn(virtualPool, config, false, bn(amountIn), 0, false, bn(point), false)
            : swapQuotePartialFill(virtualPool, config, false, bn(amountIn), 0, false, bn(point), false);
        let mine;
        try {
          mine = buy(sim, pool, amountIn, mode, point, nowTs);
        } catch (e) {
          // exactIn can legitimately overshoot the threshold; SDK would throw the same
          expect(() =>
            swapQuoteExactIn(virtualPool, config, false, bn(amountIn), 0, false, bn(point), false),
          ).toThrow();
          break;
        }
        expect(mine.baseOut.toString(), `trade ${trades} baseOut`).toBe(sdkQuote.outputAmount.toString());
        expect(mine.sqrtPriceAfter.toString(), `trade ${trades} nextSqrtPrice`).toBe(sdkQuote.nextSqrtPrice.toString());
        expect(mine.tradingFee.toString(), `trade ${trades} tradingFee`).toBe(sdkQuote.tradingFee.toString());
        expect(mine.protocolFee.toString(), `trade ${trades} protocolFee`).toBe(sdkQuote.protocolFee.toString());
        expect(mine.includedFeeInput.toString(), `trade ${trades} includedFeeInput`).toBe(
          sdkQuote.includedFeeInputAmount.toString(),
        );
        if (sim.dynamicFee && mine.feeNumerator > baseFeeNumerator(sim.baseFee, point, pool.activationPoint)) sawDynamicSurcharge = true;
        trades++;
      }
      expect(trades).toBeGreaterThan(3);
      if (sim.dynamicFee) expect(sawDynamicSurcharge, "dynamic fee path was never exercised").toBe(true);
      expect(isCurveComplete(sim, pool)).toBe(true);
      expect(pool.quoteReserve >= sim.migrationQuoteThreshold).toBe(true);
    });
  }
});
