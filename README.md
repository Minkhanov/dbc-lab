# DBC Lab

A toolkit for people building launchpads on **Meteora's Dynamic Bonding Curve (DBC)**.

Design a launch, simulate it, compare presets, and export a config that the official TypeScript SDK
(`@meteora-ag/dynamic-bonding-curve-sdk`) accepts as-is, before spending a single lamport.

> Status: stage 1 (engine, presets, CLI, devnet proof). Web UI and preset marketplace are stages 2 and 3.
> Nothing in this repository sends mainnet transactions.

## What is in the box

| Module | What it does |
|---|---|
| `src/sim/` | Bigint re-implementation of the DBC curve, fee scheduler (linear / exponential), dynamic fee, partial fills, migration fee split and the opening state of the DAMM v2 pool. Mirrors the on-chain program and is cross-checked against the SDK and against the deployed devnet program. |
| `src/presets/` | `LaunchSpec` (human-editable JSON), five starter presets, `LaunchSpec -> ConfigParameters` through the **official SDK builders**, lossless JSON export of BN values, a standalone `create-config.ts` generator. |
| `src/cli/` | `dbc-lab list / show / validate / sim / export`. |
| `src/devnet/` | Resumable devnet runner: create config, create pool, buy, migrate to DAMM v2, compare every step with the simulator. |
| `scripts/` | `dryrun-config.ts` and `conformance-devnet.ts` validate against the deployed devnet program **without spending SOL** (unsigned `simulateTransaction`). |
| `tests/` | Vitest: SDK parity, invariants, scenarios, serialisation. |

Facts and sources: [`NOTES.md`](NOTES.md). Proof of devnet integration: [`DEVNET-PROOF.md`](DEVNET-PROOF.md).

## Quick start

Node 20+.

```bash
npm install
npm test                               # SDK parity + invariants
npm run cli -- list
npm run cli -- validate classic-meme   # builds with the SDK, reports mainnet-keeper eligibility
npm run cli -- sim classic-meme --scenario sniper --trades 40 --interval 20
npm run cli -- export classic-meme --out exports
```

`sim` prints the price path trade by trade (fee %, tokens out, price, progress to graduation) and who earns what
(partner, creator, protocol, migration fee). `export` writes `spec.json`, `config-parameters.json` (BN values as
`{"$bn": "..."}`) and `create-config.ts`, a runnable script around `client.partner.createConfig(...)`.

## Presets (templates, not recommendations)

| id | idea |
|---|---|
| `devnet-micro` | tiny SOL curve with a 60 s fee decay; used for the devnet proof |
| `classic-meme` | single segment, 10 SOL graduation (picked up by mainnet keepers), 50% to 1% exponential anti-snipe fee |
| `flat-start` | 16 segments, heavy liquidity at the bottom, light at the top |
| `long-curve` | 30 to 3000 SOL market-cap range, weights grow toward the top, 2% migration fee shared with the creator |
| `stock-pair-usdc` | USDC quote, 750 USDC graduation, low-volatility start, dynamic fee on (equity-style template) |

Add your own by editing a `LaunchSpec` JSON and running `validate` / `sim` / `export` on the file.

## Honest limits

* Buys only: sells, referral accounts, locked base-token vesting, transfer-hook pools and rate-limiter configs (deprecated by Meteora) are not modelled yet.
* DAMM v2 trading after graduation is not simulated; only its opening price and liquidity.
* Presets are illustrative. The simulator reports what the program does with a given input; it does not predict demand.
* Nothing here is financial advice. Do not use presets for real launches without your own review.

## Devnet

```bash
npm run devnet:keygen        # new throw-away keypair in keys/ (git-ignored)
npm run devnet:dryrun        # create_config of every preset vs the deployed program, no SOL needed
npm run devnet:conformance   # simulator vs the program on real devnet pools, no SOL needed
npm run devnet:all           # own config -> pool -> buys -> DAMM v2 migration (needs ~1 devnet SOL)
npm run devnet:proof         # regenerate DEVNET-PROOF.md
```

## License

MIT
