/**
 * LaunchSpec -> SDK `ConfigParameters` (the exact payload `client.partner.createConfig` takes),
 * built only with the official SDK curve builders. Nothing here invents on-chain parameters.
 */
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  DammV2BaseFeeMode,
  DammV2DynamicFeeMode,
  MigratedCollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType,
  buildCurve,
  buildCurveWithCustomSqrtPrices,
  buildCurveWithLiquidityWeights,
  buildCurveWithMarketCap,
  buildCurveWithMidPrice,
  buildCurveWithTwoSegments,
  createSqrtPrices,
  type BuildCurveBaseParams,
  type ConfigParameters,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import type { LaunchSpec } from "./spec.js";
import { simConfigFromParameters } from "../sim/fromSdk.js";
import type { SimConfig } from "../sim/types.js";

const MIGRATION_FEE_OPTION: Record<LaunchSpec["migration"]["damm2FeeOption"], MigrationFeeOption> = {
  bps25: MigrationFeeOption.FixedBps25,
  bps30: MigrationFeeOption.FixedBps30,
  bps100: MigrationFeeOption.FixedBps100,
  bps200: MigrationFeeOption.FixedBps200,
  bps400: MigrationFeeOption.FixedBps400,
  bps600: MigrationFeeOption.FixedBps600,
  customizable: MigrationFeeOption.Customizable,
};

const AUTHORITY: Record<LaunchSpec["token"]["authority"], TokenAuthorityOption> = {
  immutable: TokenAuthorityOption.Immutable,
  creatorUpdate: TokenAuthorityOption.CreatorUpdateAuthority,
  partnerUpdate: TokenAuthorityOption.PartnerUpdateAuthority,
};

const DECIMALS: Record<number, TokenDecimal> = {
  6: TokenDecimal.SIX,
  7: TokenDecimal.SEVEN,
  8: TokenDecimal.EIGHT,
  9: TokenDecimal.NINE,
};

export function validateSpec(spec: LaunchSpec): string[] {
  const errs: string[] = [];
  const l = spec.liquidity;
  const sum = l.partnerPercent + l.partnerPermanentLockedPercent + l.creatorPercent + l.creatorPermanentLockedPercent;
  if (sum !== 100) errs.push(`liquidity split must sum to 100 (got ${sum}); vesting buckets are not exposed by LaunchSpec yet`);
  if (l.partnerPermanentLockedPercent + l.creatorPermanentLockedPercent < 10) {
    errs.push("at least 10% of migrated liquidity must stay locked (program: MIN_LOCKED_LIQUIDITY_BPS = 1000)");
  }
  if (spec.fee.creatorSharePercent < 0 || spec.fee.creatorSharePercent > 100) errs.push("creatorSharePercent must be 0..100");
  if (spec.migration.migrationFeePercent < 0 || spec.migration.migrationFeePercent > 99) errs.push("migrationFeePercent must be 0..99");
  if (spec.migration.migrationFeePercent === 0 && spec.migration.creatorMigrationFeePercent !== 0) {
    errs.push("creatorMigrationFeePercent must be 0 when migrationFeePercent is 0");
  }
  if (spec.fee.poolCreationFeeSol !== 0 && (spec.fee.poolCreationFeeSol < 0.001 || spec.fee.poolCreationFeeSol > 100)) {
    errs.push("poolCreationFeeSol must be 0 or within 0.001..100 SOL");
  }
  if (spec.fee.endingBps < 25) errs.push("endingBps must be >= 25 (0.25% minimum base fee)");
  if (spec.fee.startingBps > 9900) errs.push("startingBps must be <= 9900 (99%)");
  if (spec.fee.endingBps > spec.fee.startingBps) errs.push("endingBps must be <= startingBps");
  if (spec.fee.startingBps === spec.fee.endingBps && (spec.fee.numberOfPeriod !== 0 || spec.fee.totalDuration !== 0)) {
    errs.push("fixed fee: numberOfPeriod and totalDuration must be 0");
  }
  if (spec.fee.startingBps !== spec.fee.endingBps) {
    if (spec.fee.numberOfPeriod <= 0 || spec.fee.totalDuration <= 0) errs.push("decaying fee needs numberOfPeriod > 0 and totalDuration > 0");
    else if (spec.fee.totalDuration % spec.fee.numberOfPeriod !== 0) errs.push("totalDuration must be divisible by numberOfPeriod (integer period length)");
  }
  if (spec.migration.damm2FeeOption === "customizable" && !spec.migration.customPool) {
    errs.push("customizable DAMM v2 fee option needs migration.customPool");
  }
  return errs;
}

export function buildConfigParameters(spec: LaunchSpec): ConfigParameters {
  const errs = validateSpec(spec);
  if (errs.length) throw new Error(`invalid LaunchSpec "${spec.id}":\n - ${errs.join("\n - ")}`);

  const baseDecimals = DECIMALS[spec.token.decimals];
  if (baseDecimals === undefined) throw new Error("token.decimals must be 6..9");

  const migratedPoolFee =
    spec.migration.damm2FeeOption === "customizable" && spec.migration.customPool
      ? {
          collectFeeMode:
            spec.migration.customPool.collect === "quote" ? MigratedCollectFeeMode.QuoteToken : MigratedCollectFeeMode.OutputToken,
          dynamicFee: spec.migration.customPool.dynamicFee ? DammV2DynamicFeeMode.Enabled : DammV2DynamicFeeMode.Disabled,
          poolFeeBps: spec.migration.customPool.poolFeeBps,
          baseFeeMode: DammV2BaseFeeMode.FeeTimeSchedulerLinear,
        }
      : undefined;

  const common: BuildCurveBaseParams = {
    token: {
      tokenType: spec.token.standard === "spl" ? TokenType.SPLToken : TokenType.Token2022,
      tokenBaseDecimal: baseDecimals,
      tokenQuoteDecimal: spec.quote.decimals,
      tokenAuthorityOption: AUTHORITY[spec.token.authority],
      totalTokenSupply: spec.token.supply,
      leftover: spec.token.leftover,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: spec.fee.mode === "linear" ? BaseFeeMode.FeeSchedulerLinear : BaseFeeMode.FeeSchedulerExponential,
        feeSchedulerParam: {
          startingFeeBps: spec.fee.startingBps,
          endingFeeBps: spec.fee.endingBps,
          numberOfPeriod: spec.fee.numberOfPeriod,
          totalDuration: spec.fee.totalDuration,
        },
      },
      dynamicFeeEnabled: spec.fee.dynamicFee,
      collectFeeMode: spec.fee.collect === "quote" ? CollectFeeMode.QuoteToken : CollectFeeMode.OutputToken,
      creatorTradingFeePercentage: spec.fee.creatorSharePercent,
      poolCreationFee: spec.fee.poolCreationFeeSol,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MIGRATION_FEE_OPTION[spec.migration.damm2FeeOption],
      migrationFee: {
        feePercentage: spec.migration.migrationFeePercent,
        creatorFeePercentage: spec.migration.creatorMigrationFeePercent,
      },
      ...(migratedPoolFee ? { migratedPoolFee } : {}),
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: spec.liquidity.partnerPercent,
      partnerPermanentLockedLiquidityPercentage: spec.liquidity.partnerPermanentLockedPercent,
      creatorLiquidityPercentage: spec.liquidity.creatorPercent,
      creatorPermanentLockedLiquidityPercentage: spec.liquidity.creatorPermanentLockedPercent,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: spec.activation === "timestamp" ? ActivationType.Timestamp : ActivationType.Slot,
  };

  const c = spec.curve;
  switch (c.kind) {
    case "marketCap":
      return buildCurveWithMarketCap({ ...common, initialMarketCap: c.initialMarketCap, migrationMarketCap: c.migrationMarketCap });
    case "twoSegments":
      return buildCurveWithTwoSegments({
        ...common,
        initialMarketCap: c.initialMarketCap,
        migrationMarketCap: c.migrationMarketCap,
        percentageSupplyOnMigration: c.percentageSupplyOnMigration,
      });
    case "midPrice":
      return buildCurveWithMidPrice({
        ...common,
        initialMarketCap: c.initialMarketCap,
        migrationMarketCap: c.migrationMarketCap,
        midPrice: c.midPrice,
        percentageSupplyOnMigration: c.percentageSupplyOnMigration,
      });
    case "weights":
      return buildCurveWithLiquidityWeights({
        ...common,
        initialMarketCap: c.initialMarketCap,
        migrationMarketCap: c.migrationMarketCap,
        liquidityWeights: c.liquidityWeights,
      });
    case "customPrices":
      return buildCurveWithCustomSqrtPrices({
        ...common,
        sqrtPrices: createSqrtPrices(c.prices, baseDecimals, spec.quote.decimals as TokenDecimal),
        ...(c.liquidityWeights ? { liquidityWeights: c.liquidityWeights } : {}),
      });
    case "threshold":
      return buildCurve({
        ...common,
        percentageSupplyOnMigration: c.percentageSupplyOnMigration,
        migrationQuoteThreshold: c.migrationQuoteThreshold,
      });
  }
}

/** Convenience: LaunchSpec -> { SDK params, SimConfig }. */
export function buildLaunch(spec: LaunchSpec): { params: ConfigParameters; sim: SimConfig } {
  const params = buildConfigParameters(spec);
  const sim = simConfigFromParameters(params as never, spec.quote.decimals);
  return { params, sim };
}
