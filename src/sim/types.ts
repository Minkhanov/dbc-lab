/** Normalised, bigint-based view of a DBC PoolConfig used by the simulator. */

export type CollectFeeMode = 0 | 1; // 0 = quote token, 1 = output token (base on buys)
export type BaseFeeKind = 0 | 1; // 0 = linear scheduler, 1 = exponential scheduler (rate limiter is deprecated and unsupported)
export type ActivationKind = 0 | 1; // 0 = slot, 1 = timestamp

export interface CurvePoint {
  /** Upper boundary of the segment, Q64.64 sqrt price. */
  sqrtPrice: bigint;
  /** Virtual liquidity of the segment (u128). */
  liquidity: bigint;
}

export interface BaseFeeCfg {
  /** Starting ("cliff") fee, numerator over 1e9. */
  cliffFeeNumerator: bigint;
  /** Scheduler: number of periods. */
  numberOfPeriod: number;
  /** Scheduler: period length in activation points (seconds or slots). */
  periodFrequency: bigint;
  /** Scheduler: linear = absolute numerator per period; exponential = bps (of 10_000) per period. */
  reductionFactor: bigint;
  mode: BaseFeeKind;
}

export interface DynamicFeeCfg {
  maxVolatilityAccumulator: bigint;
  variableFeeControl: bigint;
  binStep: bigint;
  binStepU128: bigint;
  filterPeriod: bigint;
  decayPeriod: bigint;
  reductionFactor: bigint;
}

export interface SimConfig {
  sqrtStartPrice: bigint;
  /** Only non-empty points (liquidity > 0), ascending sqrtPrice. */
  curve: CurvePoint[];
  migrationQuoteThreshold: bigint;
  /** Derived price at which the quote reserve hits the threshold. */
  migrationSqrtPrice: bigint;
  collectFeeMode: CollectFeeMode;
  /** Share (0..100) of the non-protocol trading fee that goes to the pool creator. */
  creatorTradingFeePercentage: number;
  baseFee: BaseFeeCfg;
  dynamicFee: DynamicFeeCfg | null;
  /** Share (0..99) of the migration quote threshold taken as migration fee. */
  migrationFeePercentage: number;
  /** Share (0..100) of the migration fee that goes to the creator (rest to partner). */
  creatorMigrationFeePercentage: number;
  /** Lamports charged at pool creation (0 = none). */
  poolCreationFee: bigint;
  baseDecimals: number;
  quoteDecimals: number;
  activationType: ActivationKind;
}

export interface VolatilityState {
  sqrtPriceReference: bigint;
  volatilityAccumulator: bigint;
  volatilityReference: bigint;
  lastUpdateTimestamp: bigint;
}

export interface PoolState {
  sqrtPrice: bigint;
  /** Quote tokens that have entered the curve (fees excluded when fees are collected on the quote side). */
  quoteReserve: bigint;
  /** Base tokens sold out of the curve so far (including base-token fees in output-token mode). */
  baseSold: bigint;
  partnerQuoteFee: bigint;
  creatorQuoteFee: bigint;
  protocolQuoteFee: bigint;
  partnerBaseFee: bigint;
  creatorBaseFee: bigint;
  protocolBaseFee: bigint;
  /** Activation point (seconds or slot, depending on config). */
  activationPoint: bigint;
  volatility: VolatilityState;
  hasSwap: boolean;
}

export type SwapMode = "exactIn" | "partialFill";

export interface BuyResult {
  /** Quote amount the trader actually pays (includes fee). */
  includedFeeInput: bigint;
  /** Quote amount that was NOT consumed (partial fill only). */
  refund: bigint;
  /** Fee-excluded input that moved the curve. */
  excludedFeeInput: bigint;
  /** Base tokens the trader receives. */
  baseOut: bigint;
  tradingFee: bigint;
  protocolFee: bigint;
  /** Fee numerator that was applied (1e9 denominator). */
  feeNumerator: bigint;
  feeOnBase: boolean;
  sqrtPriceBefore: bigint;
  sqrtPriceAfter: bigint;
  completed: boolean;
}
