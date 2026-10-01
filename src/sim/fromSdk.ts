/**
 * Adapters: SDK/chain structures -> SimConfig.
 *
 * Two sources are supported:
 *  1. `ConfigParameters` produced by the official SDK curve builders (what we send to `create_config`).
 *     Derived values (migration sqrt price) are recomputed with the program's algorithm.
 *  2. The on-chain `PoolConfig` account fetched with `client.state.getPoolConfig` (used to check the simulator
 *     against a real deployment). It already contains the program-derived `migrationSqrtPrice`.
 */
import { migrationThresholdPrice } from "./curve.js";
import type { BaseFeeCfg, CollectFeeMode, CurvePoint, DynamicFeeCfg, SimConfig } from "./types.js";

interface BNLike {
  toString(radix?: number): string;
}
const big = (x: BNLike | number | bigint | string): bigint => BigInt(typeof x === "object" ? x.toString(10) : (x as number | bigint | string));

interface CurveLike {
  sqrtPrice: BNLike;
  liquidity: BNLike;
}
interface BaseFeeLike {
  cliffFeeNumerator: BNLike;
  firstFactor: number | BNLike;
  secondFactor: BNLike;
  thirdFactor: BNLike;
  baseFeeMode: number;
}
interface DynamicFeeLike {
  initialized?: number;
  maxVolatilityAccumulator: number | BNLike;
  variableFeeControl: number | BNLike;
  binStep: number | BNLike;
  binStepU128: BNLike;
  filterPeriod: number | BNLike;
  decayPeriod: number | BNLike;
  reductionFactor: number | BNLike;
}

function curveFrom(curve: readonly CurveLike[]): CurvePoint[] {
  const out: CurvePoint[] = [];
  for (const p of curve) {
    const sqrtPrice = big(p.sqrtPrice);
    const liquidity = big(p.liquidity);
    if (sqrtPrice === 0n || liquidity === 0n) break;
    out.push({ sqrtPrice, liquidity });
  }
  return out;
}

function baseFeeFrom(b: BaseFeeLike): BaseFeeCfg {
  if (b.baseFeeMode !== 0 && b.baseFeeMode !== 1) {
    throw new Error("rate-limiter base fee mode is deprecated for new configs and not supported by the simulator");
  }
  return {
    cliffFeeNumerator: big(b.cliffFeeNumerator),
    numberOfPeriod: Number(big(b.firstFactor as BNLike | number)),
    periodFrequency: big(b.secondFactor),
    reductionFactor: big(b.thirdFactor),
    mode: b.baseFeeMode,
  };
}

function dynamicFeeFrom(d: DynamicFeeLike | null | undefined): DynamicFeeCfg | null {
  if (!d) return null;
  if (d.initialized !== undefined && d.initialized === 0) return null;
  return {
    maxVolatilityAccumulator: big(d.maxVolatilityAccumulator),
    variableFeeControl: big(d.variableFeeControl),
    binStep: big(d.binStep),
    binStepU128: big(d.binStepU128),
    filterPeriod: big(d.filterPeriod),
    decayPeriod: big(d.decayPeriod),
    reductionFactor: big(d.reductionFactor),
  };
}

/** SDK `ConfigParameters` (builder output) -> SimConfig. */
export interface ConfigParametersLike {
  poolFees: { baseFee: BaseFeeLike; dynamicFee: DynamicFeeLike | null };
  collectFeeMode: number;
  activationType: number;
  tokenDecimal: number;
  migrationQuoteThreshold: BNLike;
  sqrtStartPrice: BNLike;
  creatorTradingFeePercentage: number;
  migrationFee: { feePercentage: number; creatorFeePercentage: number };
  poolCreationFee: BNLike;
  curve: readonly CurveLike[];
}

export function simConfigFromParameters(cp: ConfigParametersLike, quoteDecimals: number): SimConfig {
  const curve = curveFrom(cp.curve);
  const sqrtStartPrice = big(cp.sqrtStartPrice);
  const migrationQuoteThreshold = big(cp.migrationQuoteThreshold);
  return {
    sqrtStartPrice,
    curve,
    migrationQuoteThreshold,
    migrationSqrtPrice: migrationThresholdPrice(migrationQuoteThreshold, sqrtStartPrice, curve),
    collectFeeMode: cp.collectFeeMode as CollectFeeMode,
    creatorTradingFeePercentage: cp.creatorTradingFeePercentage,
    baseFee: baseFeeFrom(cp.poolFees.baseFee),
    dynamicFee: dynamicFeeFrom(cp.poolFees.dynamicFee),
    migrationFeePercentage: cp.migrationFee.feePercentage,
    creatorMigrationFeePercentage: cp.migrationFee.creatorFeePercentage,
    poolCreationFee: big(cp.poolCreationFee),
    baseDecimals: cp.tokenDecimal,
    quoteDecimals,
    activationType: cp.activationType === 0 ? 0 : 1,
  };
}

/** On-chain `PoolConfig` account (SDK `client.state.getPoolConfig`) -> SimConfig. */
export interface PoolConfigAccountLike {
  poolFees: { baseFee: BaseFeeLike; dynamicFee: DynamicFeeLike };
  collectFeeMode: number;
  activationType: number;
  tokenDecimal: number;
  migrationQuoteThreshold: BNLike;
  migrationSqrtPrice: BNLike;
  sqrtStartPrice: BNLike;
  creatorTradingFeePercentage: number;
  migrationFeePercentage: number;
  creatorMigrationFeePercentage: number;
  poolCreationFee: BNLike;
  curve: readonly CurveLike[];
}

export function simConfigFromAccount(pc: PoolConfigAccountLike, quoteDecimals: number): SimConfig {
  return {
    sqrtStartPrice: big(pc.sqrtStartPrice),
    curve: curveFrom(pc.curve),
    migrationQuoteThreshold: big(pc.migrationQuoteThreshold),
    migrationSqrtPrice: big(pc.migrationSqrtPrice),
    collectFeeMode: pc.collectFeeMode as CollectFeeMode,
    creatorTradingFeePercentage: pc.creatorTradingFeePercentage,
    baseFee: baseFeeFrom(pc.poolFees.baseFee),
    dynamicFee: dynamicFeeFrom(pc.poolFees.dynamicFee),
    migrationFeePercentage: pc.migrationFeePercentage,
    creatorMigrationFeePercentage: pc.creatorMigrationFeePercentage,
    poolCreationFee: big(pc.poolCreationFee),
    baseDecimals: pc.tokenDecimal,
    quoteDecimals,
    activationType: pc.activationType === 0 ? 0 : 1,
  };
}

/** On-chain `VirtualPool.poolState` (SDK `client.state.getPool(...).poolState`) -> PoolState, to continue a simulation from a live pool. */
export interface VirtualPoolAccountLike {
  poolState: {
    sqrtPrice: BNLike;
    quoteReserve: BNLike;
    baseReserve?: BNLike;
    partnerQuoteFee: BNLike;
    creatorQuoteFee: BNLike;
    protocolQuoteFee: BNLike;
    partnerBaseFee: BNLike;
    creatorBaseFee: BNLike;
    protocolBaseFee: BNLike;
    activationPoint: BNLike;
    hasSwap?: number;
    volatilityTracker: {
      sqrtPriceReference: BNLike;
      volatilityAccumulator: BNLike;
      volatilityReference: BNLike;
      lastUpdateTimestamp: BNLike;
    };
  };
}

export function poolStateFromAccount(p: VirtualPoolAccountLike): import("./types.js").PoolState {
  const s = p.poolState;
  return {
    sqrtPrice: big(s.sqrtPrice),
    quoteReserve: big(s.quoteReserve),
    baseSold: 0n,
    partnerQuoteFee: big(s.partnerQuoteFee),
    creatorQuoteFee: big(s.creatorQuoteFee),
    protocolQuoteFee: big(s.protocolQuoteFee),
    partnerBaseFee: big(s.partnerBaseFee),
    creatorBaseFee: big(s.creatorBaseFee),
    protocolBaseFee: big(s.protocolBaseFee),
    activationPoint: big(s.activationPoint),
    volatility: {
      sqrtPriceReference: big(s.volatilityTracker.sqrtPriceReference),
      volatilityAccumulator: big(s.volatilityTracker.volatilityAccumulator),
      volatilityReference: big(s.volatilityTracker.volatilityReference),
      lastUpdateTimestamp: big(s.volatilityTracker.lastUpdateTimestamp),
    },
    hasSwap: (s.hasSwap ?? 1) !== 0,
  };
}
