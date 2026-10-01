/**
 * Pool state machine for buys on the bonding curve. Mirrors
 *  - program: src/state/virtual_pool.rs (get_swap_result_from_exact_input / _partial_input, apply_swap_result,
 *             update_pre_swap, update_post_swap), src/instructions/swap/process_swap.rs
 *  - SDK:     src/math/swapQuote.ts (getSwapResultFromExactInput, getSwapResultFromPartialInput)
 *
 * Out of scope for stage 1: sells (BaseToQuote), referral accounts, rate-limiter base fee (deprecated for new
 * configs) and the "first swap with minimum fee" path.
 */
import { quoteToBase } from "./curve.js";
import {
  excludedFeeAmount,
  includedFeeAmount,
  splitPartnerCreator,
  splitProtocol,
  totalFeeNumerator,
  updateReferences,
  updateVolatilityAccumulator,
  deltaBinId,
} from "./fees.js";
import type { BuyResult, PoolState, SimConfig, SwapMode } from "./types.js";

export function initPool(cfg: SimConfig, activationPoint: bigint = 0n): PoolState {
  return {
    sqrtPrice: cfg.sqrtStartPrice,
    quoteReserve: 0n,
    baseSold: 0n,
    partnerQuoteFee: 0n,
    creatorQuoteFee: 0n,
    protocolQuoteFee: 0n,
    partnerBaseFee: 0n,
    creatorBaseFee: 0n,
    protocolBaseFee: 0n,
    activationPoint,
    volatility: {
      sqrtPriceReference: cfg.sqrtStartPrice,
      volatilityAccumulator: 0n,
      volatilityReference: 0n,
      lastUpdateTimestamp: activationPoint,
    },
    hasSwap: false,
  };
}

export function isCurveComplete(cfg: SimConfig, pool: PoolState): boolean {
  return pool.quoteReserve >= cfg.migrationQuoteThreshold;
}

/** Convert wall-clock seconds since activation into the config's activation point units (slot = 400 ms). */
export function pointAt(cfg: SimConfig, activationPoint: bigint, secondsSinceActivation: number): bigint {
  const delta = cfg.activationType === 1 ? BigInt(Math.floor(secondsSinceActivation)) : BigInt(Math.floor(secondsSinceActivation / 0.4));
  return activationPoint + delta;
}

/**
 * Execute a buy (quote -> base) against the pool, mutating `pool`.
 * @param currentPoint current slot/timestamp in config units
 * @param nowTs unix-like seconds, used only by the dynamic-fee volatility tracker
 */
export function buy(
  cfg: SimConfig,
  pool: PoolState,
  amountIn: bigint,
  mode: SwapMode,
  currentPoint: bigint,
  nowTs: bigint,
): BuyResult {
  if (amountIn <= 0n) throw new Error("Amount is zero");
  if (isCurveComplete(cfg, pool)) throw new Error("Virtual pool is completed");

  // program: pool.update_pre_swap
  if (cfg.dynamicFee) updateReferences(cfg.dynamicFee, pool.volatility, pool.sqrtPrice, nowTs);

  const feeNum = totalFeeNumerator(cfg.baseFee, cfg.dynamicFee, pool.volatility, currentPoint, pool.activationPoint);
  const feesOnInput = cfg.collectFeeMode === 0; // QuoteToken: fee taken from the quote input on buys
  const sqrtBefore = pool.sqrtPrice;

  let tradingFee = 0n;
  let protocolFee = 0n;
  let excludedIn: bigint;
  if (feesOnInput) {
    const [after, fee] = excludedFeeAmount(feeNum, amountIn);
    const [tf, pf] = splitProtocol(fee);
    tradingFee = tf;
    protocolFee = pf;
    excludedIn = after;
  } else {
    excludedIn = amountIn;
  }

  const swap = quoteToBase(cfg.curve, pool.sqrtPrice, excludedIn, cfg.migrationSqrtPrice);
  if (swap.amountLeft !== 0n && mode === "exactIn") throw new Error("Insufficient Liquidity");

  let includedIn = amountIn;
  let usedExcluded = excludedIn;
  if (swap.amountLeft !== 0n) {
    // partial fill: only part of the input fits under the migration price
    usedExcluded = excludedIn - swap.amountLeft;
    if (feesOnInput) {
      const [inc, fee] = includedFeeAmount(feeNum, usedExcluded);
      const [tf, pf] = splitProtocol(fee);
      tradingFee = tf;
      protocolFee = pf;
      includedIn = inc;
    } else {
      includedIn = usedExcluded;
    }
  }

  let baseOut = swap.baseOut;
  if (!feesOnInput) {
    // output-token mode: fee is taken from the base tokens that leave the curve
    const [afterFee, fee] = excludedFeeAmount(feeNum, swap.baseOut);
    const [tf, pf] = splitProtocol(fee);
    tradingFee = tf;
    protocolFee = pf;
    baseOut = afterFee;
  }

  // program: pool.apply_swap_result
  const { partner, creator } = splitPartnerCreator(tradingFee, cfg.creatorTradingFeePercentage);
  if (feesOnInput) {
    pool.partnerQuoteFee += partner;
    pool.creatorQuoteFee += creator;
    pool.protocolQuoteFee += protocolFee;
  } else {
    pool.partnerBaseFee += partner;
    pool.creatorBaseFee += creator;
    pool.protocolBaseFee += protocolFee;
  }
  const oldSqrt = pool.sqrtPrice;
  pool.sqrtPrice = swap.nextSqrtPrice;
  pool.quoteReserve += usedExcluded;
  pool.baseSold += feesOnInput ? baseOut : baseOut + tradingFee + protocolFee;

  // program: pool.update_post_swap
  if (cfg.dynamicFee) {
    updateVolatilityAccumulator(cfg.dynamicFee, pool.volatility, pool.sqrtPrice);
    if (deltaBinId(cfg.dynamicFee.binStepU128, oldSqrt, pool.sqrtPrice) > 0n) {
      pool.volatility.lastUpdateTimestamp = nowTs;
    }
  }
  pool.hasSwap = true;

  return {
    includedFeeInput: includedIn,
    refund: amountIn - includedIn,
    excludedFeeInput: usedExcluded,
    baseOut,
    tradingFee,
    protocolFee,
    feeNumerator: feeNum,
    feeOnBase: !feesOnInput,
    sqrtPriceBefore: sqrtBefore,
    sqrtPriceAfter: pool.sqrtPrice,
    completed: isCurveComplete(cfg, pool),
  };
}
