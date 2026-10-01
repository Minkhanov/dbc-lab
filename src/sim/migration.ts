/**
 * What happens when the curve completes: migration fee split and the opening liquidity of the DAMM v2 pool.
 * Mirrors
 *  - program: src/state/config.rs (get_migration_quote_amount, get_migration_fee_distribution),
 *             src/migration_handler/concentrated_liquidity.rs (get_included_protocol_fee_migration_amounts_1,
 *             get_migration_protocol_fees, calculate_concentrated_initial_liquidity)
 *  - docs:    https://docs.meteora.ag/core-products/dbc/formulas (Migration Fee) and /fees/overview
 * The protocol liquidity migration fee is 20 bps (docs: "fixed 0.2%").
 */
import { deltaBase } from "./qmath.js";
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from "./qmath.js";
import type { SimConfig } from "./types.js";

export const PROTOCOL_LIQUIDITY_MIGRATION_FEE_BPS = 20n;

export interface MigrationOutcome {
  /** Quote that leaves the vault as migration fee (partner + creator). */
  migrationFee: bigint;
  creatorMigrationFee: bigint;
  partnerMigrationFee: bigint;
  /** Quote moved towards DAMM v2 before the 0.2% protocol liquidity fee. */
  quoteIncludedProtocolFee: bigint;
  /** Base tokens reserved for the DAMM v2 pool before the 0.2% protocol liquidity fee (== config.migration_base_threshold). */
  baseIncludedProtocolFee: bigint;
  protocolQuoteFee: bigint;
  protocolBaseFee: bigint;
  /** Final deposits into the DAMM v2 pool. */
  poolQuote: bigint;
  poolBase: bigint;
  /** Opening price of the DAMM v2 pool == DBC migration price. */
  poolSqrtPrice: bigint;
}

function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

/**
 * @param protocolLiquidityFeeBps value stored on the virtual pool (`protocol_liquidity_migration_fee_bps`), 20 for pools
 *   created after the fee was introduced and 0 for older pools (read it from chain when replaying an existing pool).
 */
export function migrationOutcome(cfg: SimConfig, protocolLiquidityFeeBps: bigint = PROTOCOL_LIQUIDITY_MIGRATION_FEE_BPS): MigrationOutcome {
  const thr = cfg.migrationQuoteThreshold;
  const quoteAmount = ceilDiv(thr * BigInt(100 - cfg.migrationFeePercentage), 100n);
  const migrationFee = thr - quoteAmount;
  const creatorMigrationFee = (migrationFee * BigInt(cfg.creatorMigrationFeePercentage)) / 100n;
  const partnerMigrationFee = migrationFee - creatorMigrationFee;

  const sqrt = cfg.migrationSqrtPrice;
  const liquidity = (quoteAmount << 128n) / (sqrt - MIN_SQRT_PRICE);
  const baseAmount = deltaBase(sqrt, MAX_SQRT_PRICE, liquidity, "up");

  const protocolQuoteFee = (quoteAmount * protocolLiquidityFeeBps) / 10_000n;
  const feeLiquidity = (protocolQuoteFee << 128n) / (sqrt - MIN_SQRT_PRICE);
  const protocolBaseFee = deltaBase(sqrt, MAX_SQRT_PRICE, feeLiquidity, "down");

  return {
    migrationFee,
    creatorMigrationFee,
    partnerMigrationFee,
    quoteIncludedProtocolFee: quoteAmount,
    baseIncludedProtocolFee: baseAmount,
    protocolQuoteFee,
    protocolBaseFee,
    poolQuote: quoteAmount - protocolQuoteFee,
    poolBase: baseAmount - protocolBaseFee,
    poolSqrtPrice: sqrt,
  };
}

/**
 * Opening liquidity of the migrated DAMM v2 pool for the (default) concentrated-liquidity handler:
 * min(liquidity implied by the base deposit, liquidity implied by the quote deposit), both floor-rounded.
 * Mirrors `calculate_concentrated_initial_liquidity` in migration_handler/concentrated_liquidity.rs.
 * Not valid for the compounding migrated-pool fee mode (a different handler).
 */
export function dammInitialLiquidity(m: MigrationOutcome): bigint {
  const sqrt = m.poolSqrtPrice;
  const fromBase = (m.poolBase * sqrt * MAX_SQRT_PRICE) / (MAX_SQRT_PRICE - sqrt);
  const fromQuote = (m.poolQuote << 128n) / (sqrt - MIN_SQRT_PRICE);
  return fromBase > fromQuote ? fromQuote : fromBase;
}
