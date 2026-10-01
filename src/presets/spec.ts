/**
 * LaunchSpec: a JSON-serialisable, human-editable description of a DBC launch.
 * It is deliberately close to the official SDK builder inputs (`buildCurve*` in
 * @meteora-ag/dynamic-bonding-curve-sdk) so that exporting to the SDK is a mechanical, lossless step.
 */

export type CurveSpec =
  /** Single constant-product segment from an initial to a migration market cap (SDK: buildCurveWithMarketCap). */
  | { kind: "marketCap"; initialMarketCap: number; migrationMarketCap: number }
  /** Two segments (SDK: buildCurveWithTwoSegments). */
  | { kind: "twoSegments"; initialMarketCap: number; migrationMarketCap: number; percentageSupplyOnMigration: number }
  /** Two segments with explicit mid price (SDK: buildCurveWithMidPrice). */
  | {
      kind: "midPrice";
      initialMarketCap: number;
      migrationMarketCap: number;
      midPrice: number;
      percentageSupplyOnMigration: number;
    }
  /** Up to 16 equal-price-ratio segments with per-segment liquidity weights (SDK: buildCurveWithLiquidityWeights). */
  | { kind: "weights"; initialMarketCap: number; migrationMarketCap: number; liquidityWeights: number[] }
  /** Explicit UI price checkpoints (quote per token) with optional weights (SDK: buildCurveWithCustomSqrtPrices). */
  | { kind: "customPrices"; prices: number[]; liquidityWeights?: number[] }
  /** Target migration quote threshold and share of supply sold at migration (SDK: buildCurve). */
  | { kind: "threshold"; migrationQuoteThreshold: number; percentageSupplyOnMigration: number };

export interface FeeSpec {
  /** Scheduler shape of the bonding-curve base fee (fixed fee: startingBps == endingBps, periods = 0, duration = 0). */
  mode: "linear" | "exponential";
  startingBps: number;
  endingBps: number;
  numberOfPeriod: number;
  /** Seconds (timestamp activation) or slots (slot activation) over which the fee decays. */
  totalDuration: number;
  dynamicFee: boolean;
  /** Where bonding-curve fees are collected: the quote token, or the token the trader receives. */
  collect: "quote" | "output";
  /** Share (0..100) of non-protocol trading fees that goes to the pool creator; the rest to the partner. */
  creatorSharePercent: number;
  /** One-off fee in SOL charged when a creator launches from the config (0 = none, otherwise 0.001..100). */
  poolCreationFeeSol: number;
}

export interface MigrationSpec {
  /** DAMM v2 fee config used for the graduated pool. */
  damm2FeeOption: "bps25" | "bps30" | "bps100" | "bps200" | "bps400" | "bps600" | "customizable";
  /** Fee taken from the quote threshold at graduation (0..99 %) and the creator's share of it (0..100 %). */
  migrationFeePercent: number;
  creatorMigrationFeePercent: number;
  /** Only used when damm2FeeOption is "customizable". */
  customPool?: { collect: "quote" | "output"; dynamicFee: boolean; poolFeeBps: number };
}

export interface LiquiditySpec {
  /** Percent of migrated liquidity (all four must sum to 100, at least 10 must stay locked). */
  partnerPercent: number;
  partnerPermanentLockedPercent: number;
  creatorPercent: number;
  creatorPermanentLockedPercent: number;
}

export interface LaunchSpec {
  id: string;
  name: string;
  summary: string;
  tags: string[];
  quote: { symbol: string; decimals: number };
  token: {
    supply: number;
    decimals: 6 | 7 | 8 | 9;
    standard: "spl" | "token2022";
    authority: "immutable" | "creatorUpdate" | "partnerUpdate";
    /** Fixed-supply leftover reserve in whole tokens (0 for dynamic supply). */
    leftover: number;
  };
  curve: CurveSpec;
  fee: FeeSpec;
  migration: MigrationSpec;
  liquidity: LiquiditySpec;
  activation: "timestamp" | "slot";
  /** Free-text design notes shown next to the preset. Not sent on chain. */
  notes?: string[];
}
