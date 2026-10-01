/**
 * Preset library (stage 1: five hand-written templates).
 *
 * These are *illustrative templates*, not recommendations. Every number is a plain input to the
 * official SDK curve builders; economics are produced by the simulator (`dbc-lab sim <id>`),
 * never claimed here. Market caps are expressed in whole quote tokens (e.g. SOL, USDC).
 */
import type { LaunchSpec } from "./spec.js";

const lockedAll = {
  partnerPercent: 0,
  partnerPermanentLockedPercent: 100,
  creatorPercent: 0,
  creatorPermanentLockedPercent: 0,
} as const;

export const PRESETS: readonly LaunchSpec[] = [
  {
    id: "devnet-micro",
    name: "Devnet micro (test rig)",
    summary:
      "Tiny SOL-quoted curve with a fast 60 s fee decay. Used for the devnet proof: a few small buys cross the whole curve and trigger migration to DAMM v2.",
    tags: ["devnet", "test", "sol-quote"],
    quote: { symbol: "SOL", decimals: 9 },
    token: { supply: 1_000_000_000, decimals: 6, standard: "spl", authority: "immutable", leftover: 0 },
    curve: { kind: "threshold", migrationQuoteThreshold: 0.2, percentageSupplyOnMigration: 20 },
    fee: {
      mode: "linear",
      startingBps: 500,
      endingBps: 100,
      numberOfPeriod: 6,
      totalDuration: 60,
      dynamicFee: false,
      collect: "quote",
      creatorSharePercent: 50,
      poolCreationFeeSol: 0,
    },
    migration: { damm2FeeOption: "bps100", migrationFeePercent: 0, creatorMigrationFeePercent: 0 },
    liquidity: lockedAll,
    activation: "timestamp",
    notes: ["Not a real launch design: thresholds are far below the 10 SOL that mainnet migration keepers pick up."],
  },
  {
    id: "classic-meme",
    name: "Classic meme launch (10 SOL graduation)",
    summary:
      "Single constant-product segment, 1B supply, 20% of supply seeds DAMM v2, graduation at exactly 10 SOL so the mainnet migration keepers pick it up. 50% -> 1% exponential anti-snipe fee over 5 minutes.",
    tags: ["meme", "sol-quote", "keeper-compatible"],
    quote: { symbol: "SOL", decimals: 9 },
    token: { supply: 1_000_000_000, decimals: 6, standard: "spl", authority: "immutable", leftover: 0 },
    curve: { kind: "threshold", migrationQuoteThreshold: 10, percentageSupplyOnMigration: 20 },
    fee: {
      mode: "exponential",
      startingBps: 5000,
      endingBps: 100,
      numberOfPeriod: 30,
      totalDuration: 300,
      dynamicFee: true,
      collect: "quote",
      creatorSharePercent: 50,
      poolCreationFeeSol: 0,
    },
    migration: { damm2FeeOption: "bps100", migrationFeePercent: 0, creatorMigrationFeePercent: 0 },
    liquidity: lockedAll,
    activation: "timestamp",
  },
  {
    id: "flat-start",
    name: "Flat start, steep finish",
    summary:
      "16-segment curve with heavy liquidity at the bottom and light liquidity at the top: price barely moves while the first buyers come in, then accelerates toward graduation. Fixed 1% fee.",
    tags: ["flat-curve", "sol-quote", "fair-start"],
    quote: { symbol: "SOL", decimals: 9 },
    token: { supply: 1_000_000_000, decimals: 6, standard: "spl", authority: "immutable", leftover: 1000 },
    curve: {
      kind: "weights",
      initialMarketCap: 30,
      migrationMarketCap: 300,
      liquidityWeights: [16, 14, 12, 10, 9, 8, 7, 6, 5, 4, 4, 3, 3, 2, 2, 1],
    },
    fee: {
      mode: "linear",
      startingBps: 100,
      endingBps: 100,
      numberOfPeriod: 0,
      totalDuration: 0,
      dynamicFee: false,
      collect: "quote",
      creatorSharePercent: 20,
      poolCreationFeeSol: 0,
    },
    migration: { damm2FeeOption: "bps100", migrationFeePercent: 0, creatorMigrationFeePercent: 0 },
    liquidity: lockedAll,
    activation: "timestamp",
  },
  {
    id: "long-curve",
    name: "Long curve (deep graduation)",
    summary:
      "Wide market-cap range (30 -> 3000 SOL equivalent) with moderately front-loaded liquidity, so graduation needs a much larger quote reserve (hundreds of SOL) and early buyers do not get an outsized price advantage. Linear 25% -> 1% fee over 15 minutes, 2% migration fee shared 50/50 with the creator.",
    tags: ["long-curve", "sol-quote", "deep-liquidity"],
    quote: { symbol: "SOL", decimals: 9 },
    token: { supply: 1_000_000_000, decimals: 6, standard: "spl", authority: "immutable", leftover: 1000 },
    curve: {
      kind: "weights",
      initialMarketCap: 30,
      migrationMarketCap: 3000,
      liquidityWeights: [6, 6, 5, 5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2],
    },
    fee: {
      mode: "linear",
      startingBps: 2500,
      endingBps: 100,
      numberOfPeriod: 30,
      totalDuration: 900,
      dynamicFee: true,
      collect: "quote",
      creatorSharePercent: 50,
      poolCreationFeeSol: 0,
    },
    migration: { damm2FeeOption: "bps100", migrationFeePercent: 2, creatorMigrationFeePercent: 50 },
    liquidity: lockedAll,
    activation: "timestamp",
  },
  {
    id: "stock-pair-usdc",
    name: "Tokenized-stock style (USDC quote, 750 USDC graduation)",
    summary:
      "Template for thinly traded / newly tokenized names: USDC quote, graduation at 750 USDC (the keeper threshold for USDC), low-volatility start (high liquidity at the bottom), dynamic fee on to dampen volatility spikes. Replace the USDC mint with a stock-token mint for stock pairs; keepers then need a threshold of at least ~750 USD equivalent.",
    tags: ["equity", "stocks", "usdc-quote", "keeper-compatible"],
    quote: { symbol: "USDC", decimals: 6 },
    token: { supply: 1_000_000, decimals: 6, standard: "spl", authority: "immutable", leftover: 0 },
    curve: { kind: "threshold", migrationQuoteThreshold: 750, percentageSupplyOnMigration: 30 },
    fee: {
      mode: "exponential",
      startingBps: 1000,
      endingBps: 50,
      numberOfPeriod: 20,
      totalDuration: 600,
      dynamicFee: true,
      collect: "quote",
      creatorSharePercent: 0,
      poolCreationFeeSol: 0,
    },
    migration: { damm2FeeOption: "bps30", migrationFeePercent: 0, creatorMigrationFeePercent: 0 },
    liquidity: lockedAll,
    activation: "timestamp",
    notes: [
      "Illustrative. Not investment advice. xStocks / Ondo / Backpack mints and their regulatory status are out of scope for this tool.",
    ],
  },
];

export function getPreset(id: string): LaunchSpec {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown preset "${id}". Available: ${PRESETS.map((x) => x.id).join(", ")}`);
  return structuredClone(p);
}
