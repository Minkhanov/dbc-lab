/**
 * Will Meteora's mainnet migration keepers pick this config up?
 * Source: https://docs.meteora.ag/developer-guides/dbc (section "Migration Keepers") and
 *         https://docs.meteora.ag/core-products/dbc/migration-and-liquidity.
 * Keepers run on mainnet only. If a pool is not eligible the creator must migrate manually
 * (SDK `migration.migrateToDammV2`, or https://migrator.meteora.ag).
 */
import type { SimConfig } from "./types.js";

/** Quote symbol -> migration_quote_threshold (whole tokens) that keepers handle, exactly as listed in the docs. */
export const KEEPER_THRESHOLDS: Readonly<Record<string, number>> = {
  SOL: 10,
  USDC: 750,
  TRUMP: 100,
  JUP: 1500,
  USD1: 750,
  MET: 1500,
  JUPUSD: 750,
  VIRTUAL: 42000,
};

export interface KeeperVerdict {
  eligible: boolean | "unknown";
  verdict: string;
}

export function keeperCompatibility(cfg: SimConfig, quoteSymbol: string): KeeperVerdict {
  const sym = quoteSymbol.toUpperCase();
  const thr = Number(cfg.migrationQuoteThreshold) / 10 ** cfg.quoteDecimals;
  const want = KEEPER_THRESHOLDS[sym];
  if (want === undefined) {
    return {
      eligible: "unknown",
      verdict:
        `quote "${quoteSymbol}" is not in the keeper table. Keepers also migrate Stock Token pairs with a threshold >= ~750 USD equivalent, ` +
        `and Jupiter Verified quote tokens (Organic Score > 50) with a threshold > 750 USD. Check the quote token manually.`,
    };
  }
  if (Math.abs(thr - want) < 1e-9) {
    return { eligible: true, verdict: `eligible: threshold ${thr} ${sym} equals the keeper value.` };
  }
  return {
    eligible: false,
    verdict: `NOT eligible: keepers migrate ${sym} pools only at a threshold of exactly ${want} ${sym} (this config: ${thr}). Migrate manually (SDK or migrator.meteora.ag) or change the threshold.`,
  };
}
