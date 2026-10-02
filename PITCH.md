# DBC Lab — pitch

**Design, simulate and export Meteora Dynamic Bonding Curve launches before spending a single lamport.**

## Problem
Launchpad builders on Meteora DBC tune a dozen interacting parameters: supply, starting price, migration
threshold, curve shape, fee scheduler, dynamic fee, migration fee split. Today the only way to see how a
config behaves is to deploy it and buy into it. Mistakes are found on mainnet, with real users' money.

## Solution
DBC Lab is an open-source toolkit for launchpad builders:

- **Simulator** — a bigint re-implementation of the DBC curve, fee scheduler (linear and exponential),
  dynamic fee, partial fills, migration fee split and the opening state of the DAMM v2 pool.
- **Presets** — human-editable `LaunchSpec` files (five starters: classic meme with 10 SOL graduation, long curve,
  flat start / steep finish, tokenized-stock style with USDC quote, and a devnet micro test rig), compared side by side on the same buy scenario.
- **Export** — configs are built through the **official SDK builders** (`@meteora-ag/dynamic-bonding-curve-sdk`)
  and exported losslessly, plus a ready `create-config.ts`.
- **CLI** — `dbc-lab list / show / validate / sim / export`.

## Proof it matches the chain
Checked against the deployed DBC program on devnet with unsigned `simulateTransaction` (no SOL spent):

| Check | Result |
|---|---|
| Buys on 176 live devnet pools (linear and exponential schedulers, dynamic fee, partial fills) | **176 / 176 match to the unit** (tokens out, price, reserves, fee accumulators) |
| Fee decay timing (program clock) | 6 / 6 match |
| DAMM v2 opening price after migration | **37 / 37 match** |
| Config validation | 5 / 5 presets accepted by the program |
| **Own launch on devnet, signed transactions** (2 Oct 2026): config → pool → 11 buys → migration to DAMM v2 | **11 / 11 buys: chain = simulator = SDK to the unit; DAMM v2 opening price equals the DBC migration price exactly** |

Details: [`DEVNET-PROOF.md`](DEVNET-PROOF.md), sources: [`NOTES.md`](NOTES.md). 32 unit tests.

## Roadmap to the deadline (13 Oct)
1. Sells and referral fees in the simulator, vesting/locker support, more presets.
2. **Pool inspector** (read-only): paste any mainnet or devnet pool address — current state, progress to
   migration, live fee, "what if I buy X", and a simulator-vs-program conformance badge.
3. Web UI with preset comparison and one-click config export. (Own devnet config → pool → buys → DAMM v2 migration run: **done 2 Oct**, see DEVNET-PROOF.md.)
4. Video walkthrough.

## Why it matters
Every launchpad on DBC needs the same thing: confidence that a curve does what the team thinks before
users trade on it. DBC Lab turns config tuning from trial-and-error on mainnet into a reproducible,
testable step — and the preset format is a base for an open **DBC Config Preset Marketplace**.

## Team
Marat Minkhanov (SHERKHAN MM) — builder; development with AI assistance (Claude Code), every result
cross-checked against the on-chain program.

Repository: https://github.com/Minkhanov/dbc-lab
