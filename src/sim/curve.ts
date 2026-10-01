/**
 * Curve walking: how far a given amount of quote moves price along the DBC piecewise
 * constant-product curve. Mirrors
 *  - program: src/params/liquidity_distribution.rs (get_migration_threshold_price, get_base_token_for_swap),
 *             src/state/virtual_pool.rs (get_swap_amount_from_quote_amount)
 *  - SDK:     src/math/swapQuote.ts (calculateQuoteToBaseFromAmountIn), src/helpers/common.ts
 */
import { deltaBase, deltaQuote, nextSqrtPriceFromQuoteIn } from "./qmath.js";
import type { CurvePoint } from "./types.js";

export interface QuoteToBaseResult {
  baseOut: bigint;
  nextSqrtPrice: bigint;
  amountLeft: bigint;
}

/**
 * Buy: spend `amountIn` quote starting at `currentSqrtPrice`, never moving beyond `stopSqrtPrice`
 * (the migration price). Rounding identical to the program (max amount in per segment rounds up,
 * base output rounds down).
 */
export function quoteToBase(
  curve: readonly CurvePoint[],
  currentSqrtPrice: bigint,
  amountIn: bigint,
  stopSqrtPrice: bigint,
): QuoteToBaseResult {
  if (amountIn === 0n) return { baseOut: 0n, nextSqrtPrice: currentSqrtPrice, amountLeft: 0n };
  let total = 0n;
  let cur = currentSqrtPrice;
  let left = amountIn;
  for (const seg of curve) {
    if (seg.sqrtPrice === 0n || seg.liquidity === 0n) break;
    const ref = stopSqrtPrice < seg.sqrtPrice ? stopSqrtPrice : seg.sqrtPrice;
    if (ref > cur) {
      const maxIn = deltaQuote(cur, ref, seg.liquidity, "up");
      if (left < maxIn) {
        const next = nextSqrtPriceFromQuoteIn(cur, seg.liquidity, left);
        total += deltaBase(cur, next, seg.liquidity, "down");
        cur = next;
        left = 0n;
        break;
      }
      total += deltaBase(cur, ref, seg.liquidity, "down");
      cur = ref;
      left -= maxIn;
      if (ref === stopSqrtPrice) break;
    }
  }
  return { baseOut: total, nextSqrtPrice: cur, amountLeft: left };
}

/** Sqrt price at which cumulative quote reaches `threshold` (program: get_migration_threshold_price). */
export function migrationThresholdPrice(
  threshold: bigint,
  sqrtStartPrice: bigint,
  curve: readonly CurvePoint[],
): bigint {
  const first = curve[0];
  if (!first) throw new Error("empty curve");
  let next = sqrtStartPrice;
  const total = deltaQuote(next, first.sqrtPrice, first.liquidity, "up");
  if (total > threshold) {
    return nextSqrtPriceFromQuoteIn(next, first.liquidity, threshold);
  }
  let left = threshold - total;
  next = first.sqrtPrice;
  for (let i = 1; i < curve.length; i++) {
    const seg = curve[i]!;
    const maxAmount = deltaQuote(next, seg.sqrtPrice, seg.liquidity, "up");
    if (maxAmount > left) {
      next = nextSqrtPriceFromQuoteIn(next, seg.liquidity, left);
      left = 0n;
      break;
    }
    left -= maxAmount;
    next = seg.sqrtPrice;
  }
  if (left !== 0n) throw new Error("curve cannot reach the migration threshold (not enough liquidity)");
  return next;
}

/** Base tokens sold along the curve between `sqrtStartPrice` and `sqrtMigrationPrice` (program: get_base_token_for_swap). */
export function baseTokenForSwap(
  sqrtStartPrice: bigint,
  sqrtMigrationPrice: bigint,
  curve: readonly CurvePoint[],
): bigint {
  let total = 0n;
  for (let i = 0; i < curve.length; i++) {
    const seg = curve[i]!;
    const lower = i === 0 ? sqrtStartPrice : curve[i - 1]!.sqrtPrice;
    if (seg.sqrtPrice > sqrtMigrationPrice) {
      total += deltaBase(lower, sqrtMigrationPrice, seg.liquidity, "up");
      break;
    }
    total += deltaBase(lower, seg.sqrtPrice, seg.liquidity, "up");
  }
  return total;
}

/** Cumulative quote required to move from start price to each curve checkpoint (for charts). */
export function curveBreakdown(
  sqrtStartPrice: bigint,
  curve: readonly CurvePoint[],
  migrationSqrtPrice: bigint,
): { fromSqrtPrice: bigint; toSqrtPrice: bigint; liquidity: bigint; quote: bigint; base: bigint }[] {
  const out: { fromSqrtPrice: bigint; toSqrtPrice: bigint; liquidity: bigint; quote: bigint; base: bigint }[] = [];
  let lower = sqrtStartPrice;
  for (const seg of curve) {
    if (lower >= migrationSqrtPrice) break;
    const upper = seg.sqrtPrice < migrationSqrtPrice ? seg.sqrtPrice : migrationSqrtPrice;
    out.push({
      fromSqrtPrice: lower,
      toSqrtPrice: upper,
      liquidity: seg.liquidity,
      quote: deltaQuote(lower, upper, seg.liquidity, "up"),
      base: deltaBase(lower, upper, seg.liquidity, "up"),
    });
    lower = seg.sqrtPrice;
  }
  return out;
}
