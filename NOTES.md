# NOTES: verified facts about Meteora DBC / DAMM v2

Everything below was read from a primary source (docs.meteora.ag, the MeteoraAg GitHub repositories, or the live devnet RPC) on 2026-10-01.
Items marked **[unverified]** were not checked and must not be relied on.

Sources and the exact revisions read:

| Source | Revision |
|---|---|
| DBC program `MeteoraAg/dynamic-bonding-curve` | `f552f20` (Release 0.2.1, 2026-09-09) |
| DBC TS SDK `MeteoraAg/dynamic-bonding-curve-sdk` (`packages/dynamic-bonding-curve`) | `a28b723` (2026-09-24); npm `@meteora-ag/dynamic-bonding-curve-sdk@1.5.13` is what we install |
| DAMM v2 SDK `MeteoraAg/damm-v2-sdk` | `79ebbfe` (2026-09-30); npm package name is `@meteora-ag/cp-amm-sdk@1.5.1` |
| Docs | https://docs.meteora.ag (pages cited inline, all fetched as `.md`) |

## 1. Programs and addresses

| Item | Address | Verified how |
|---|---|---|
| DBC `dynamic_bonding_curve` (mainnet and devnet, same id) | `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN` | docs [DBC developer guide](https://docs.meteora.ag/developer-guides/dbc); `getAccountInfo` on devnet: executable, owner BPFLoaderUpgradeable |
| DBC pool authority PDA | `FhVo3mqL8PW5pH5U2CN4XE33DokiyZnUwuGpH2hmHLuM` | same docs page |
| DAMM v2 `cp_amm` (same id on both) | `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG` | docs [DAMM v2 guide](https://docs.meteora.ag/developer-guides/damm-v2); executable on devnet |
| Locker | `LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn` | SDK `constants.ts`; executable on devnet |
| Metaplex token metadata | `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s` | SDK `constants.ts`; executable on devnet |
| DAMM v2 migration fee configs (index = `MigrationFeeOption`: 25, 30, 100, 200, 400, 600 bps, customizable) | `7F6dnUcR...NESd`, `2nHK1kju...1z6k`, `Hv8Lmzmn...Xcjp`, `2c4cYd4r...JXmq`, `AkmQWebA...7cFD`, `DbCRBj8M...Q44u`, `A8gMrEPJ...MCtck` | SDK `constants.ts` / docs; **all seven exist on devnet, owned by the DAMM v2 program** (RPC check) |

Devnet state on 2026-10-01: **85,796 DBC `VirtualPool` accounts** exist (`client.state.getPools()`), of which 7,576 are unmigrated with at least one swap. That is a large corpus of real configs, which the conformance script uses.

## 2. Lifecycle (docs: [What is DBC](https://docs.meteora.ag/core-products/dbc/what-is-dbc), [Migration and liquidity](https://docs.meteora.ag/core-products/dbc/migration-and-liquidity))

1. **Create config** (`PoolConfig`, partner-owned template): quote mint, curve, fees, token settings, migration target, liquidity split. New signer account passed to `create_config`.
2. **Create virtual pool**: `VirtualPool` PDA from (quote mint, base mint, config) plus base/quote vaults; creator signs; optional pool-creation fee; metadata via Metaplex.
3. **Trade on the curve** until `quote_reserve >= migration_quote_threshold`. Then normal swaps fail (`PoolIsCompleted`).
4. **Migrate** to DAMM v2 (`migration_damm_v2`): creates the DAMM v2 pool at the **migration price discovered by the curve**, mints two position NFTs, applies locks. A locker step (`createLocker`) is only needed with base-token locked vesting.
5. Claims: partner / creator trading fees any time; migration fee, surplus after completion; fixed-supply leftover after the DAMM pool exists.

Migration states: `PreBondingCurve`, `PostBondingCurve` (locker needed), `LockedVesting` (ready), `CreatedPool`.

**Keepers**: Meteora's migration keepers exist **on mainnet only**. They migrate when `migration_quote_threshold` equals exactly: SOL 10, USDC 750, TRUMP 100, JUP 1500, USD1 750, MET 1500, JupUSD 750, VIRTUAL 42000, or a Stock-Token quote pair with threshold >= ~750 USD equivalent, or a Jupiter Verified quote token with Organic Score > 50 and threshold > 750 USD. Otherwise the creator must migrate manually (SDK `migrateToDammV2` or https://migrator.meteora.ag, which supports devnet). Source: [DBC developer guide, "Migration Keepers"](https://docs.meteora.ag/developer-guides/dbc). The tool exposes this as `keeperCompatibility()`.

## 3. Config parameters (docs: [Launch configuration](https://docs.meteora.ag/core-products/dbc/launch-configurations), [Accounts and permissions](https://docs.meteora.ag/core-products/dbc/accounts-and-permissions); program: `state/config.rs`)

| Area | Fact |
|---|---|
| Curve | `sqrt_start_price` (Q64.64) plus up to **16** points (`MAX_CURVE_POINT`; 20 slots stored). Each point = upper `sqrt_price` + `liquidity` (u128). Prices strictly increase, liquidity > 0. Start sqrt price >= `4295048016`, migration sqrt price < `79226673521066979257578248091`. |
| Derived by the program at `create_config` | `migration_sqrt_price` (price where cumulative quote hits the threshold), `swap_base_amount`, `migration_base_threshold`. The simulator recomputes all three and matches the deployed program (section 7). |
| Quote mint | SPL Token mints are permissionless; Token-2022 only with metadata extensions and zero transfer fee, otherwise a `TokenBadge`. |
| Token | decimals 6..9; SPL or Token-2022; authority option (creator/partner update authority, immutable; mint-authority options only for transfer-hook configs). |
| Supply | `buildCurve*` helpers produce a **fixed supply** config (`tokenSupply` set, leftover receiver must be non-default). |
| Fees (bonding phase) | denominator `1_000_000_000`; min base fee 0.25% (2,500,000); total capped at 99%. Base fee = scheduler: **linear** (`cliff - period * reduction`) or **exponential** (`cliff * (1 - reduction/10000)^period`, Q64.64). Rate limiter is deprecated and rejected for new configs. Optional **dynamic fee** (volatility based). `collect_fee_mode`: quote token or output token. |
| Fee split | protocol 20% of the trading fee; (optional referral = 20% of the protocol part); the rest is split creator / partner by `creator_trading_fee_percentage`. |
| Pool creation fee | optional, 0.001..100 SOL; 10% protocol, 90% partner. |
| Migration fee | 0..99% of the threshold, creator share 0..100%; if 0 the creator share must be 0. A fixed **0.2%** protocol liquidity migration fee reduces the liquidity that enters the DAMM pool. |
| Liquidity split after migration | partner/creator x unlocked/permanent-locked/vesting must sum to 100%; **>= 10% still locked after one day**; vesting <= 2 years. |
| Migrated DAMM v2 pool | fee option 25/30/100/200/400/600 bps or customizable (0.1%..10%, collect mode, dynamic fee, scheduler). |
| Surplus | quote above the threshold: 80% to partner+creator (split by creator trading-fee %), 20% protocol. |

## 4. Math (docs: [Formulas](https://docs.meteora.ag/core-products/dbc/formulas); program: `curve.rs`, `state/virtual_pool.rs`, `math/fee_math.rs`)

* Each segment is constant product: quote needed `L * (sqrtUpper - sqrtLower) >> 128`, base available `L * (sqrtUpper - sqrtLower) / (sqrtUpper * sqrtLower)`.
* Buy (quote in): fee on the **input** in quote-token mode (`fee = ceil(in * numerator / 1e9)`), on the **output** in output-token mode. Next sqrt price after spending `dy`: `sqrtP + (dy << 128) / L` (floor). Per segment: `maxIn = deltaQuote(cur, ref, L, up)`; if `left < maxIn` stop inside the segment, else consume it fully. Base out rounds down.
* Stop price of a buy is `migration_sqrt_price`. `ExactIn` that does not fit fails with `Insufficient Liquidity`; `PartialFill` consumes only what fits, recomputes the gross input and refunds the rest.
* `quote_reserve += fee-excluded input` (quote mode). Dynamic fee: `ceil((acc * binStep)^2 * variableFeeControl / 1e11)`, tracker updated pre/post swap.
* Migration quote amount = `ceil(threshold * (100 - migrationFee%) / 100)`; creator migration fee = `floor(fee * creator% / 100)`.

## 5. TypeScript SDK facts we depend on

Package `@meteora-ag/dynamic-bonding-curve-sdk@1.5.13`, deps: `@coral-xyz/anchor ^0.31`, `@solana/web3.js ^1.98`, `@solana/spl-token ^0.4.13`, `bn.js`, `decimal.js`. Returned transactions are **unsigned legacy `Transaction`s**; the caller sets blockhash, signs, sends. Docs: [Getting started](https://docs.meteora.ag/developer-guides/dbc/typescript-sdk/getting-started), [Examples](https://docs.meteora.ag/developer-guides/dbc/typescript-sdk/examples), [Reference](https://docs.meteora.ag/developer-guides/dbc/typescript-sdk/reference).

* `DynamicBondingCurveClient.create(connection, commitment)` exposes `partner`, `creator`, `pool`, `migration`, `state`.
* Config: `buildCurve`, `buildCurveWithMarketCap`, `buildCurveWithTwoSegments`, `buildCurveWithMidPrice`, `buildCurveWithLiquidityWeights`, `buildCurveWithCustomSqrtPrices` -> `ConfigParameters`; `client.partner.createConfig({config, feeClaimer, leftoverReceiver, payer, quoteMint, ...params})` (signers: payer and the new `config` keypair).
* Pool: `client.creator.createPool({baseMint, config, name, symbol, uri, payer, poolCreator})` (signers: payer, baseMint keypair).
* Quote/swap: `client.pool.swapQuote2({virtualPool, config, swapBaseForQuote, swapMode, amountIn, slippageBps, hasReferral, eligibleForFirstSwapWithMinFee, currentPoint})`, `client.pool.swap2({owner, payer, pool, swapBaseForQuote, swapMode, amountIn, minimumAmountOut, referralTokenAccount})`. `swap2` wraps/unwraps native SOL itself. `SwapMode`: `ExactIn=0`, `PartialFill=1`, `ExactOut=2`.
* Migration: `client.migration.migrateToDammV2({payer, pool, dammConfig})` -> `{transaction, firstPositionNftKeypair, secondPositionNftKeypair}` (all three must sign; adds a 600k compute-unit limit). `dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption]`.
* State: `client.state.getPool/getPoolConfig/getPools/getPoolsByConfig`, fee metrics/breakdown, curve progress.

### Behaviours found while building (not obvious from the docs)

1. `buildCurveWithLiquidityWeights` throws `leftOverDelta must be less than totalLeftover` when `token.leftover = 0`; rounding loss must be absorbed by a non-zero leftover (we use 1000 tokens).
2. `getFeeSchedulerParams` computes `periodFrequency = totalDuration / numberOfPeriod` in JS; non-divisible values are not safe, so `validateSpec` requires divisibility.
3. For the **exponential** scheduler the per-period reduction is floored to whole bps, so the effective ending fee differs slightly from the requested one (requested 1.00%, effective 1.0019% for 50% -> 1% over 30 periods).
4. `buildCurve*` always produce fixed-supply configs; the last curve entry out to `MAX_SQRT_PRICE` holds the unsold remainder and is never reached.
5. A `PartialFill` that crosses the threshold can leave the reserve a few lamports above the threshold (3 lamports on a real devnet pool), so "surplus" is dust, not a feature.
6. The public devnet faucet (`api.devnet.solana.com` `requestAirdrop`) returned `429 ... airdrop limit today or faucet has run dry` for this machine for the whole session; `faucet.solana.com` blocks scripted access (HTTP 403 for static assets) and uses a human check, so it is not used by the tool.

## 6. What this tool does with it

`LaunchSpec` (JSON) -> official SDK builders -> `ConfigParameters` (what goes on chain) -> our bigint simulator reads that same object. Export writes the spec, the BN-safe `config-parameters.json` and a runnable `create-config.ts`.

## 7. Simulator verification status (all reproducible from this repo)

| Check | Result |
|---|---|
| Unit/invariant/parity tests (`npm test`) | see STATUS.md for the current count |
| Simulator vs SDK `swapQuoteExactIn` / `swapQuotePartialFill` over random buy sequences until graduation, all 5 presets (incl. exponential scheduler, dynamic fee) | exact equality of output, next sqrt price, trading fee, protocol fee, gross input |
| `create_config` of every preset simulated against the **deployed devnet program** (`scripts/dryrun-config.ts`) | program accepts all; `migrationSqrtPrice`, `migrationQuoteThreshold`, `swapBaseAmount`, `migrationBaseThreshold` equal the simulator's own values |
| Buys on **real devnet pools** simulated against the deployed program vs our simulator (`scripts/conformance-devnet.ts`) | see DEVNET-PROOF.md |

## 8. Open points / not covered yet

* Sells (BaseToQuote), referral accounts, rate-limiter configs (deprecated), `enableFirstSwapWithMinFee`, locked base-token vesting, Token-2022 transfer-hook pools: **not modelled**.
* DAMM v2 behaviour after migration (LP fees, scheduler) is not modelled; only the opening state is.
* Token-2022 quote mints / `TokenBadge` flows **[unverified]**.
* Mainnet behaviour (keepers, real volume) **[unverified]**; nothing was sent to mainnet.
