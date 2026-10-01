/**
 * DBC fee math (bonding-curve phase), mirrored from
 *  - program: src/base_fee/fee_scheduler.rs, src/math/fee_math.rs, src/state/fee.rs (VolatilityTracker)
 *  - SDK:     src/math/feeMath.ts, src/math/poolFees/{feeScheduler,dynamicFee}.ts
 * Denominator for all fee numerators: 1_000_000_000.
 */
import { BASIS_POINT_MAX, FEE_DENOMINATOR, ONE_Q64, mulDiv, powQ64 } from "./qmath.js";
import type { BaseFeeCfg, DynamicFeeCfg, VolatilityState } from "./types.js";

export const MAX_FEE_NUMERATOR = 990_000_000n; // 99%
export const MIN_FEE_NUMERATOR = 2_500_000n; // 0.25%
export const PROTOCOL_FEE_PERCENT = 20n;
export const DYNAMIC_FEE_SCALING_FACTOR = 100_000_000_000n;
export const DYNAMIC_FEE_ROUNDING_OFFSET = 99_999_999_999n;

/** Fee numerator after `period` completed periods (period is clamped to numberOfPeriod). */
export function baseFeeNumeratorByPeriod(cfg: BaseFeeCfg, period: bigint): bigint {
  const p = period < BigInt(cfg.numberOfPeriod) ? period : BigInt(cfg.numberOfPeriod);
  if (cfg.mode === 0) {
    const reduction = p * cfg.reductionFactor;
    if (reduction > cfg.cliffFeeNumerator) throw new Error("fee scheduler underflow");
    return cfg.cliffFeeNumerator - reduction;
  }
  // exponential: cliff * (1 - reduction/10_000)^p, in Q64.64
  if (p === 0n) return cfg.cliffFeeNumerator;
  const bps = (cfg.reductionFactor << 64n) / BASIS_POINT_MAX;
  const base = ONE_Q64 - bps;
  const result = powQ64(base, p);
  return (cfg.cliffFeeNumerator * result) / ONE_Q64;
}

/** Base fee numerator at `currentPoint` given the pool activation point. */
export function baseFeeNumerator(cfg: BaseFeeCfg, currentPoint: bigint, activationPoint: bigint): bigint {
  if (cfg.periodFrequency === 0n) return cfg.cliffFeeNumerator;
  const elapsed = currentPoint - activationPoint;
  if (elapsed < 0n) throw new Error("current point is before activation point");
  return baseFeeNumeratorByPeriod(cfg, elapsed / cfg.periodFrequency);
}

export function minBaseFeeNumerator(cfg: BaseFeeCfg): bigint {
  return baseFeeNumeratorByPeriod(cfg, BigInt(cfg.numberOfPeriod));
}

/** dynamic_fee_numerator = ((volatility_accumulator * bin_step)^2 * variable_fee_control + 99_999_999_999) / 100_000_000_000 */
export function variableFeeNumerator(cfg: DynamicFeeCfg | null, v: VolatilityState): bigint {
  if (!cfg) return 0n;
  const vb = v.volatilityAccumulator * cfg.binStep;
  const sq = vb * vb;
  const vFee = sq * cfg.variableFeeControl;
  return (vFee + DYNAMIC_FEE_ROUNDING_OFFSET) / DYNAMIC_FEE_SCALING_FACTOR;
}

export function totalFeeNumerator(
  base: BaseFeeCfg,
  dyn: DynamicFeeCfg | null,
  v: VolatilityState,
  currentPoint: bigint,
  activationPoint: bigint,
): bigint {
  const total = baseFeeNumerator(base, currentPoint, activationPoint) + variableFeeNumerator(dyn, v);
  return total > MAX_FEE_NUMERATOR ? MAX_FEE_NUMERATOR : total;
}

/** [amount without fee, fee]; fee is rounded UP. */
export function excludedFeeAmount(feeNumerator: bigint, included: bigint): [bigint, bigint] {
  const fee = mulDiv(included, feeNumerator, FEE_DENOMINATOR, "up");
  return [included - fee, fee];
}

/** [amount including fee, fee]; used when a partial fill must recompute the gross input. */
export function includedFeeAmount(feeNumerator: bigint, excluded: bigint): [bigint, bigint] {
  const included = mulDiv(excluded, FEE_DENOMINATOR, FEE_DENOMINATOR - feeNumerator, "up");
  return [included, included - excluded];
}

/** Split a fee into [tradingFee(partner+creator), protocolFee]; no referral in the simulator. */
export function splitProtocol(fee: bigint): [bigint, bigint] {
  const protocol = (fee * PROTOCOL_FEE_PERCENT) / 100n;
  return [fee - protocol, protocol];
}

/** Split the non-protocol trading fee between partner and creator. */
export function splitPartnerCreator(tradingFee: bigint, creatorPercent: number): { partner: bigint; creator: bigint } {
  if (creatorPercent === 0) return { partner: tradingFee, creator: 0n };
  const creator = (tradingFee * BigInt(creatorPercent)) / 100n;
  return { partner: tradingFee - creator, creator };
}

// ---------------------------------------------------------------------------------------------
// VolatilityTracker (dynamic fee state machine). Mirrors programs/.../state/fee.rs
// ---------------------------------------------------------------------------------------------

export function deltaBinId(binStepU128: bigint, sqrtA: bigint, sqrtB: bigint): bigint {
  const [upper, lower] = sqrtA > sqrtB ? [sqrtA, sqrtB] : [sqrtB, sqrtA];
  const priceRatio = (upper << 64n) / lower;
  const delta = (priceRatio - ONE_Q64) / binStepU128;
  return delta * 2n;
}

export function updateReferences(cfg: DynamicFeeCfg, v: VolatilityState, sqrtPriceCurrent: bigint, nowTs: bigint): void {
  const elapsed = nowTs > v.lastUpdateTimestamp ? nowTs - v.lastUpdateTimestamp : 0n;
  if (elapsed >= cfg.filterPeriod) {
    v.sqrtPriceReference = sqrtPriceCurrent;
    if (elapsed < cfg.decayPeriod) {
      v.volatilityReference = (v.volatilityAccumulator * cfg.reductionFactor) / BASIS_POINT_MAX;
    } else {
      v.volatilityReference = 0n;
    }
  }
}

export function updateVolatilityAccumulator(cfg: DynamicFeeCfg, v: VolatilityState, sqrtPrice: bigint): void {
  const delta = deltaBinId(cfg.binStepU128, sqrtPrice, v.sqrtPriceReference);
  const acc = v.volatilityReference + delta * BASIS_POINT_MAX;
  v.volatilityAccumulator = acc < cfg.maxVolatilityAccumulator ? acc : cfg.maxVolatilityAccumulator;
}
