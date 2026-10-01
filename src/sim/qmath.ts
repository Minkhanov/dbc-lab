/**
 * Fixed-point helpers for the DBC simulator.
 *
 * All values are bigint. DBC stores sqrt prices as Q64.64 (u128) and liquidity as u128.
 * The formulas mirror the on-chain program (MeteoraAg/dynamic-bonding-curve,
 * programs/dynamic-bonding-curve/src/curve.rs) and the official SDK
 * (packages/dynamic-bonding-curve/src/math/curve.ts). They are re-implemented here on bigint
 * so the simulator has no BN dependency and can run in a browser; tests cross-check every
 * function against the SDK.
 */

export const RESOLUTION = 64n;
export const ONE_Q64 = 1n << RESOLUTION;

export const FEE_DENOMINATOR = 1_000_000_000n;
export const BASIS_POINT_MAX = 10_000n;

export const MIN_SQRT_PRICE = 4295048016n;
export const MAX_SQRT_PRICE = 79226673521066979257578248091n;

export const U64_MAX = (1n << 64n) - 1n;
export const U128_MAX = (1n << 128n) - 1n;

export type Rounding = "up" | "down";

export function mulDiv(x: bigint, y: bigint, d: bigint, round: Rounding): bigint {
  if (d === 0n) throw new Error("mulDiv: division by zero");
  const prod = x * y;
  if (round === "up") return (prod + d - 1n) / d;
  return prod / d;
}

/** Δquote = L * (sqrtUpper - sqrtLower) / 2^128 */
export function deltaQuote(lower: bigint, upper: bigint, liquidity: bigint, round: Rounding): bigint {
  const prod = liquidity * (upper - lower);
  if (round === "up") {
    const denom = 1n << (RESOLUTION * 2n);
    return (prod + denom - 1n) / denom;
  }
  return prod >> (RESOLUTION * 2n);
}

/** Δbase = L * (sqrtUpper - sqrtLower) / (sqrtUpper * sqrtLower) */
export function deltaBase(lower: bigint, upper: bigint, liquidity: bigint, round: Rounding): bigint {
  const denom = lower * upper;
  if (denom === 0n) throw new Error("deltaBase: zero denominator");
  return mulDiv(liquidity, upper - lower, denom, round);
}

/** next sqrt price after spending `quoteIn` of quote token: sqrtP' = sqrtP + Δy * 2^128 / L (rounded down) */
export function nextSqrtPriceFromQuoteIn(sqrtPrice: bigint, liquidity: bigint, quoteIn: bigint): bigint {
  if (sqrtPrice === 0n) throw new Error("sqrt_price must be greater than 0");
  if (liquidity === 0n) throw new Error("liquidity must be greater than 0");
  return sqrtPrice + (quoteIn << (RESOLUTION * 2n)) / liquidity;
}

/** Q64.64 exponentiation, binary exponentiation with truncating division (matches SDK `pow` / program `pow`). */
export function powQ64(base: bigint, exp: bigint): bigint {
  if (exp === 0n) return ONE_Q64;
  if (base === 0n) return 0n;
  if (base === ONE_Q64) return ONE_Q64;
  let result = ONE_Q64;
  let cur = base;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = (result * cur) / ONE_Q64;
    cur = (cur * cur) / ONE_Q64;
    e >>= 1n;
  }
  return result;
}

/** Q64.64 sqrt price -> floating point UI price (quote per 1 base token, decimals applied). Display only. */
export function sqrtPriceToPrice(sqrtPrice: bigint, baseDecimals: number, quoteDecimals: number): number {
  // price_raw = (sqrt / 2^64)^2 ; split to keep precision for large values
  const hi = Number(sqrtPrice >> 32n) / 2 ** 32; // sqrt / 2^64 with 32 fractional bits shifted
  const lo = Number(sqrtPrice & 0xffffffffn) / 2 ** 64;
  const s = hi + lo;
  const raw = s * s;
  return raw * 10 ** (baseDecimals - quoteDecimals);
}

/** Inverse of `sqrtPriceToPrice`; display / input helper (same convention as SDK getSqrtPriceFromPrice, but float based). */
export function priceToSqrtPrice(price: number, baseDecimals: number, quoteDecimals: number): bigint {
  const raw = price / 10 ** (baseDecimals - quoteDecimals);
  const s = Math.sqrt(raw);
  return BigInt(Math.floor(s * 2 ** 32)) << 32n;
}

export function bigintToNumber(x: bigint, decimals: number): number {
  const neg = x < 0n;
  const a = neg ? -x : x;
  const base = 10n ** BigInt(decimals);
  const whole = Number(a / base);
  const frac = Number(a % base) / Number(base);
  const v = whole + frac;
  return neg ? -v : v;
}
