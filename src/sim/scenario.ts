/**
 * Scenario runner: replays a list of timed buys against a SimConfig and reports the price path,
 * fees, time to graduation and who earns what. Pure function, no network.
 */
import { curveBreakdown } from "./curve.js";
import { migrationOutcome } from "./migration.js";
import { buy, initPool, isCurveComplete, pointAt } from "./pool.js";
import { bigintToNumber, sqrtPriceToPrice } from "./qmath.js";
import type { SimConfig } from "./types.js";

export interface ScenarioBuy {
  /** Seconds since pool activation. */
  atSec: number;
  /** Quote amount in UI units (e.g. SOL). */
  quote: number;
  label?: string;
}

export type ScenarioSpec =
  | { kind: "even"; trades: number; totalQuote: number; intervalSec: number }
  | {
      kind: "sniperThenOrganic";
      sniperQuote: number;
      sniperAtSec: number;
      organicTrades: number;
      organicQuoteEach: number;
      organicStartSec: number;
      organicIntervalSec: number;
    }
  | { kind: "whale"; whaleQuote: number; whaleAtSec: number; organicTrades: number; organicQuoteEach: number; organicIntervalSec: number }
  | { kind: "custom"; buys: ScenarioBuy[] };

export function expandScenario(s: ScenarioSpec): ScenarioBuy[] {
  switch (s.kind) {
    case "even":
      return Array.from({ length: s.trades }, (_, i) => ({ atSec: i * s.intervalSec, quote: s.totalQuote / s.trades }));
    case "sniperThenOrganic":
      return [
        { atSec: s.sniperAtSec, quote: s.sniperQuote, label: "sniper" },
        ...Array.from({ length: s.organicTrades }, (_, i) => ({
          atSec: s.organicStartSec + i * s.organicIntervalSec,
          quote: s.organicQuoteEach,
          label: "organic",
        })),
      ];
    case "whale":
      return [
        ...Array.from({ length: s.organicTrades }, (_, i) => ({ atSec: i * s.organicIntervalSec, quote: s.organicQuoteEach, label: "organic" })),
        { atSec: s.whaleAtSec, quote: s.whaleQuote, label: "whale" },
      ].sort((a, b) => a.atSec - b.atSec);
    case "custom":
      return [...s.buys].sort((a, b) => a.atSec - b.atSec);
  }
}

export interface TradeRow {
  index: number;
  atSec: number;
  label: string;
  requestedQuote: number;
  paidQuote: number;
  refundQuote: number;
  feePercent: number;
  baseOut: number;
  priceAfter: number;
  marketCapAfter: number | null;
  raisedQuote: number;
  progressPercent: number;
  completed: boolean;
}

export interface SimReport {
  quoteDecimals: number;
  baseDecimals: number;
  startPrice: number;
  migrationPrice: number;
  startMarketCap: number | null;
  migrationMarketCap: number | null;
  thresholdQuote: number;
  trades: TradeRow[];
  skippedAfterGraduation: number;
  graduated: boolean;
  graduationAtSec: number | null;
  /** Gross quote that buyers paid (fees included), refunds excluded. */
  buyersPaidQuote: number;
  fees: { totalQuote: number; totalBase: number; avgPercentOfPaid: number; partnerQuote: number; creatorQuote: number; protocolQuote: number };
  migration: {
    migrationFeeQuote: number;
    creatorMigrationFeeQuote: number;
    partnerMigrationFeeQuote: number;
    damm2PoolQuote: number;
    damm2PoolBase: number;
    damm2OpeningPrice: number;
    protocolLiquidityFeeQuote: number;
  };
  income: { creatorQuote: number; partnerQuote: number; protocolQuote: number; note: string };
  segments: { fromPrice: number; toPrice: number; quote: number; base: number }[];
}

export interface RunOptions {
  /** Total token supply in whole tokens, to report market caps. */
  supply?: number;
  /** Activation point in config units; irrelevant for results, defaults to 1_000_000. */
  activationPoint?: bigint;
}

const toUi = (x: bigint, d: number) => bigintToNumber(x, d);

export function runScenario(cfg: SimConfig, buys: readonly ScenarioBuy[], opts: RunOptions = {}): SimReport {
  const act = opts.activationPoint ?? 1_000_000n;
  const pool = initPool(cfg, act);
  const qd = cfg.quoteDecimals;
  const bd = cfg.baseDecimals;
  const price = (sp: bigint) => sqrtPriceToPrice(sp, bd, qd);
  const mcap = (p: number) => (opts.supply ? p * opts.supply : null);

  const rows: TradeRow[] = [];
  let paid = 0n;
  let feeQuote = 0n;
  let graduatedAt: number | null = null;
  let skipped = 0;

  buys.forEach((b, i) => {
    if (isCurveComplete(cfg, pool)) {
      skipped++;
      return;
    }
    const amount = BigInt(Math.max(1, Math.round(b.quote * 10 ** qd)));
    const point = pointAt(cfg, act, b.atSec);
    const nowTs = act + BigInt(Math.floor(b.atSec));
    const r = buy(cfg, pool, amount, "partialFill", point, nowTs);
    paid += r.includedFeeInput;
    if (!r.feeOnBase) feeQuote += r.tradingFee + r.protocolFee;
    const p = price(pool.sqrtPrice);
    rows.push({
      index: i,
      atSec: b.atSec,
      label: b.label ?? "",
      requestedQuote: b.quote,
      paidQuote: toUi(r.includedFeeInput, qd),
      refundQuote: toUi(r.refund, qd),
      feePercent: Number(r.feeNumerator) / 1e7,
      baseOut: toUi(r.baseOut, bd),
      priceAfter: p,
      marketCapAfter: mcap(p),
      raisedQuote: toUi(pool.quoteReserve, qd),
      progressPercent: Math.min(100, (Number(pool.quoteReserve) / Number(cfg.migrationQuoteThreshold)) * 100),
      completed: r.completed,
    });
    if (r.completed && graduatedAt === null) graduatedAt = b.atSec;
  });

  const mig = migrationOutcome(cfg);
  const graduated = isCurveComplete(cfg, pool);
  const startPrice = price(cfg.sqrtStartPrice);
  const migPrice = price(cfg.migrationSqrtPrice);
  const creatorQuote = pool.creatorQuoteFee + (graduated ? mig.creatorMigrationFee : 0n);
  const partnerQuote =
    pool.partnerQuoteFee + (graduated ? mig.partnerMigrationFee : 0n) + (cfg.poolCreationFee * 90n) / 100n;
  const protocolQuote = pool.protocolQuoteFee + (graduated ? mig.protocolQuoteFee : 0n) + (cfg.poolCreationFee * 10n) / 100n;

  const feeTotalQuote = pool.partnerQuoteFee + pool.creatorQuoteFee + pool.protocolQuoteFee;
  return {
    quoteDecimals: qd,
    baseDecimals: bd,
    startPrice,
    migrationPrice: migPrice,
    startMarketCap: mcap(startPrice),
    migrationMarketCap: mcap(migPrice),
    thresholdQuote: toUi(cfg.migrationQuoteThreshold, qd),
    trades: rows,
    skippedAfterGraduation: skipped,
    graduated,
    graduationAtSec: graduatedAt,
    buyersPaidQuote: toUi(paid, qd),
    fees: {
      totalQuote: toUi(feeTotalQuote, qd),
      totalBase: toUi(pool.partnerBaseFee + pool.creatorBaseFee + pool.protocolBaseFee, bd),
      avgPercentOfPaid: paid > 0n ? (Number(feeQuote) / Number(paid)) * 100 : 0,
      partnerQuote: toUi(pool.partnerQuoteFee, qd),
      creatorQuote: toUi(pool.creatorQuoteFee, qd),
      protocolQuote: toUi(pool.protocolQuoteFee, qd),
    },
    migration: {
      migrationFeeQuote: toUi(mig.migrationFee, qd),
      creatorMigrationFeeQuote: toUi(mig.creatorMigrationFee, qd),
      partnerMigrationFeeQuote: toUi(mig.partnerMigrationFee, qd),
      damm2PoolQuote: toUi(mig.poolQuote, qd),
      damm2PoolBase: toUi(mig.poolBase, bd),
      damm2OpeningPrice: migPrice,
      protocolLiquidityFeeQuote: toUi(mig.protocolQuoteFee, qd),
    },
    income: {
      creatorQuote: toUi(creatorQuote, qd),
      partnerQuote: toUi(partnerQuote, qd),
      protocolQuote: toUi(protocolQuote, qd),
      note:
        "Trading fees accrue on the curve (quote-token mode); migration fee and pool creation fee are included only when the curve graduated / the pool exists. DAMM v2 LP fees after graduation are not modelled.",
    },
    segments: curveBreakdown(cfg.sqrtStartPrice, cfg.curve, cfg.migrationSqrtPrice).map((s) => ({
      fromPrice: price(s.fromSqrtPrice),
      toPrice: price(s.toSqrtPrice),
      quote: toUi(s.quote, qd),
      base: toUi(s.base, bd),
    })),
  };
}
