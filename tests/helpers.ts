import BN from "bn.js";
import type { PoolState, SimConfig } from "../src/sim/types.js";

/** Deterministic PRNG so failures are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const bn = (x: bigint | number | string): BN => new BN(x.toString());

/** Build the BN-shaped objects the SDK quote functions expect, from our SimConfig + PoolState. */
export function sdkViews(sim: SimConfig, params: any, pool: PoolState) {
  const dyn = sim.dynamicFee;
  const config: any = {
    poolFees: {
      baseFee: params.poolFees.baseFee,
      dynamicFee: dyn
        ? {
            initialized: 1,
            maxVolatilityAccumulator: Number(dyn.maxVolatilityAccumulator),
            variableFeeControl: Number(dyn.variableFeeControl),
            binStep: Number(dyn.binStep),
            filterPeriod: Number(dyn.filterPeriod),
            decayPeriod: Number(dyn.decayPeriod),
            reductionFactor: Number(dyn.reductionFactor),
            binStepU128: bn(dyn.binStepU128),
          }
        : { initialized: 0, maxVolatilityAccumulator: 0, variableFeeControl: 0, binStep: 0, filterPeriod: 0, decayPeriod: 0, reductionFactor: 0, binStepU128: bn(0) },
    },
    collectFeeMode: sim.collectFeeMode,
    migrationQuoteThreshold: bn(sim.migrationQuoteThreshold),
    migrationSqrtPrice: bn(sim.migrationSqrtPrice),
    sqrtStartPrice: bn(sim.sqrtStartPrice),
    curve: sim.curve.map((p) => ({ sqrtPrice: bn(p.sqrtPrice), liquidity: bn(p.liquidity) })),
  };
  const virtualPool: any = {
    poolState: {
      sqrtPrice: bn(pool.sqrtPrice),
      quoteReserve: bn(pool.quoteReserve),
      activationPoint: bn(pool.activationPoint),
      volatilityTracker: {
        volatilityAccumulator: bn(pool.volatility.volatilityAccumulator),
        volatilityReference: bn(pool.volatility.volatilityReference),
        sqrtPriceReference: bn(pool.volatility.sqrtPriceReference),
        lastUpdateTimestamp: bn(pool.volatility.lastUpdateTimestamp),
      },
    },
  };
  return { config, virtualPool };
}
