# DEVNET-PROOF

Everything here happened on **Solana devnet**. No mainnet transaction was sent, no real wallet was used.
The only key is a throw-away devnet keypair that lives outside git (`keys/`, ignored). Programs are the real deployed ones:
DBC `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`, DAMM v2 `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`.

Generated: 2026-10-02T06:29:01.413Z

## A. Own launch: config -> pool -> buys -> migration to DAMM v2

Payer / partner / creator / trader (same throw-away wallet): `EaF7jiLSjxvKNr76VmPM8aWucP1j5i8A6eM6WUjX3LRE`
Preset: `devnet-micro`

| Step | Address / signature | Links |
|---|---|---|
| DBC config | `FwNgepD3vqiwYMwkhMFrhmDg3xPXnCGM5iJ6eRTXWEyJ` | [address](https://explorer.solana.com/address/FwNgepD3vqiwYMwkhMFrhmDg3xPXnCGM5iJ6eRTXWEyJ?cluster=devnet) |
| `create_config` tx | `oca1oaM8AmAcQCA3XyUVaZR9fXCmMGqm4CXNUpgDSmpPojQj8uDQ1DDAV1v4Jvke4XbG2y9gkGV8t3WgBMpJ8cA` | [explorer](https://explorer.solana.com/tx/oca1oaM8AmAcQCA3XyUVaZR9fXCmMGqm4CXNUpgDSmpPojQj8uDQ1DDAV1v4Jvke4XbG2y9gkGV8t3WgBMpJ8cA?cluster=devnet), [solscan](https://solscan.io/tx/oca1oaM8AmAcQCA3XyUVaZR9fXCmMGqm4CXNUpgDSmpPojQj8uDQ1DDAV1v4Jvke4XbG2y9gkGV8t3WgBMpJ8cA?cluster=devnet) |
| Base mint | `7M4187oaHkNDJ4PYw11LEDB5cDmRKE217Hd9TsfG7pzT` | [address](https://explorer.solana.com/address/7M4187oaHkNDJ4PYw11LEDB5cDmRKE217Hd9TsfG7pzT?cluster=devnet) |
| Virtual pool | `CzSqJKHWMHZNTcbVfWPQh1TWhyTMdY9s37zRnJwtrfhk` | [address](https://explorer.solana.com/address/CzSqJKHWMHZNTcbVfWPQh1TWhyTMdY9s37zRnJwtrfhk?cluster=devnet) |
| `initialize_virtual_pool` tx | `Y6ddcqKMqzor3ToXugsSPFWgfSw32Guy4nzjwDvCuixuaZS4Ybeah7s1ahD3qLFR9G3dpeCHePAeCFzKNtgauuw` | [explorer](https://explorer.solana.com/tx/Y6ddcqKMqzor3ToXugsSPFWgfSw32Guy4nzjwDvCuixuaZS4Ybeah7s1ahD3qLFR9G3dpeCHePAeCFzKNtgauuw?cluster=devnet) |
| buy #0 (exactIn, 0.008 SOL) | `yK1HRU9gcmMr5i9uysJXpK6KTZmVBqoHhCRLkAzvA97KpbmVG226P4HkbxaSc1RdQNFQ1K88o4rpYnubMbcFVsi` | [explorer](https://explorer.solana.com/tx/yK1HRU9gcmMr5i9uysJXpK6KTZmVBqoHhCRLkAzvA97KpbmVG226P4HkbxaSc1RdQNFQ1K88o4rpYnubMbcFVsi?cluster=devnet) |
| buy #1 (exactIn, 0.008 SOL) | `4zkTxvFKfgRX1L4FKYeWGGujbQKXVaHhbZ7dKGofefzABQpGptvzEK2oCdihz7q4M22NjpB6rZEiCs1P8xu1ymBN` | [explorer](https://explorer.solana.com/tx/4zkTxvFKfgRX1L4FKYeWGGujbQKXVaHhbZ7dKGofefzABQpGptvzEK2oCdihz7q4M22NjpB6rZEiCs1P8xu1ymBN?cluster=devnet) |
| buy #2 (exactIn, 0.008 SOL) | `5vXFVfi2UuAQBtRqz6596cTASFNKBJWSv6rRfusQ8sYxgTEpdb84nmSp1au6ZwVdtpmpn5sxXXtdS3e6c9WzzoLb` | [explorer](https://explorer.solana.com/tx/5vXFVfi2UuAQBtRqz6596cTASFNKBJWSv6rRfusQ8sYxgTEpdb84nmSp1au6ZwVdtpmpn5sxXXtdS3e6c9WzzoLb?cluster=devnet) |
| buy #3 (exactIn, 0.008 SOL) | `2ubgPKVbfC9sgyGxeNYPe4KuM1yu4ZiKJauc78eWbZ5jwcqa7ufXuTiMFe3cCYAAwqi3c32saiHSGfX2GVQijyAX` | [explorer](https://explorer.solana.com/tx/2ubgPKVbfC9sgyGxeNYPe4KuM1yu4ZiKJauc78eWbZ5jwcqa7ufXuTiMFe3cCYAAwqi3c32saiHSGfX2GVQijyAX?cluster=devnet) |
| buy #4 (exactIn, 0.008 SOL) | `2M2czNNFa5uQNjNuYHmbDbym56b8fVK1gE6VkUhoPYz4wkxeKSdgce7iMMTU36drTCKER3ru7PM51w7ew5uSR7Fo` | [explorer](https://explorer.solana.com/tx/2M2czNNFa5uQNjNuYHmbDbym56b8fVK1gE6VkUhoPYz4wkxeKSdgce7iMMTU36drTCKER3ru7PM51w7ew5uSR7Fo?cluster=devnet) |
| buy #5 (exactIn, 0.008 SOL) | `34k4deG53Tn9cXejwAdRW2TbpNvpuxuEeVoQBGiBfrQkbxZk28BZgx9SSShrNwSWwux7wfToAwDaFkPmjLbALHnG` | [explorer](https://explorer.solana.com/tx/34k4deG53Tn9cXejwAdRW2TbpNvpuxuEeVoQBGiBfrQkbxZk28BZgx9SSShrNwSWwux7wfToAwDaFkPmjLbALHnG?cluster=devnet) |
| buy #6 (exactIn, 0.008 SOL) | `35Lm9f7jUDwdzEiw3HuucZEt9Q6oigLKu5gp4ymxzDrcF8sZ3BzcojQCcqfSakabGUdf5HCiWqHgVxpm1BJNJoVd` | [explorer](https://explorer.solana.com/tx/35Lm9f7jUDwdzEiw3HuucZEt9Q6oigLKu5gp4ymxzDrcF8sZ3BzcojQCcqfSakabGUdf5HCiWqHgVxpm1BJNJoVd?cluster=devnet) |
| buy #7 (exactIn, 0.008 SOL) | `ZUZQryUunBavNmFfvWu9C5p8PjzHNL6HsqhHQPMaaAsDid6m5BoZc5Bue1dqjJ1CRfTzj6XFw7S4ZHyFVidZq7L` | [explorer](https://explorer.solana.com/tx/ZUZQryUunBavNmFfvWu9C5p8PjzHNL6HsqhHQPMaaAsDid6m5BoZc5Bue1dqjJ1CRfTzj6XFw7S4ZHyFVidZq7L?cluster=devnet) |
| buy #8 (exactIn, 0.02 SOL) | `4gRZomcJnBsa3jHAB4TtZLtr2mRuKuYvih53HYhNNTAak35pk1qi54NkuUkmuqnePumZoCcTCHkzm62bByu4Vz9e` | [explorer](https://explorer.solana.com/tx/4gRZomcJnBsa3jHAB4TtZLtr2mRuKuYvih53HYhNNTAak35pk1qi54NkuUkmuqnePumZoCcTCHkzm62bByu4Vz9e?cluster=devnet) |
| buy #9 (exactIn, 0.04 SOL) | `3NPkp1JA5TTb23eBuUoM8jEvnQm3bjC3xJW1RL5HARspPXu13CQe3D3JVpy8by44NttS2cmHfTgiuRXfD21UtDBn` | [explorer](https://explorer.solana.com/tx/3NPkp1JA5TTb23eBuUoM8jEvnQm3bjC3xJW1RL5HARspPXu13CQe3D3JVpy8by44NttS2cmHfTgiuRXfD21UtDBn?cluster=devnet) |
| buy #10 (partialFill, 0.2 SOL) | `2BkMvLQMGHGUVJRccDbMnKDMLgNL8ct7JtARMvZz4iVZRikVntf17tC6kzmcCgS4CBysMDGb3YRPKJmV4KSxm6BY` | [explorer](https://explorer.solana.com/tx/2BkMvLQMGHGUVJRccDbMnKDMLgNL8ct7JtARMvZz4iVZRikVntf17tC6kzmcCgS4CBysMDGb3YRPKJmV4KSxm6BY?cluster=devnet) |
| `migration_damm_v2` tx | `3SvG3EdXYCGgq9NqC2jHepd9GDfBw51UyhSjfcrgNG7rbT1u7XaCtr3mc9RcDEfyCprNHeJXxPAC8ZvCAZjbs923` | [explorer](https://explorer.solana.com/tx/3SvG3EdXYCGgq9NqC2jHepd9GDfBw51UyhSjfcrgNG7rbT1u7XaCtr3mc9RcDEfyCprNHeJXxPAC8ZvCAZjbs923?cluster=devnet) |
| DAMM v2 pool | `HHfwM12KU5pVG4ti4UWednTmvY2QDJwtenXYt1tt7QdB` | [address](https://explorer.solana.com/address/HHfwM12KU5pVG4ti4UWednTmvY2QDJwtenXYt1tt7QdB?cluster=devnet) |
| Position NFTs | `BpmSM5XTgXquVTFEva55TM2tNMDSMzARPQ4QRzi4ePQS`, `7WaRziZuEPzaUbR9RDX1sfvkzTXsuwpof8QYb8HvkEEU` | |

### Config values derived by the program vs the simulator

| field | on chain | simulator | equal |
|---|---|---|---|
| migrationSqrtPrice | 18446744073709551 | 18446744073709551 | yes |
| migrationQuoteThreshold | 200000000 | 200000000 | yes |
| sqrtStartPrice | 4611687360628964 | 4611687360628964 | yes |
| cliffFeeNumerator | 50000000 | 50000000 | yes |
| curveSegments | 2 | 2 | yes |
| swapBaseAmount | 799999767165210 | 799999767165210 | yes |
| migrationBaseThreshold | 200000046566969 | 200000046566969 | yes |

### Simulator vs chain, trade by trade

`chain` = tokens actually received (change of the buyer's token account); `sdk` = SDK `swapQuote2` taken just before sending; `sim` = this repo's simulator replayed at the on-chain block time of the transaction.

| # | mode | in (SOL) | pool age (s) | fee period | chain out | sdk quote | sim out | replay from real pre-state | cumulative sim path |
|---|---|---|---|---|---|---|---|---|---|
| 0 | exactIn | 0.008 | 2 | 0 | 109156134692234 | 109156134692234 | 109156134692234 | equal | equal |
| 1 | exactIn | 0.008 | 12 | 1 | 89454871628581 | 89454871628581 | 89454871628581 | equal | equal |
| 2 | exactIn | 0.008 | 22 | 2 | 74640861265232 | 74640861265232 | 74640861265232 | equal | equal |
| 3 | exactIn | 0.008 | 32 | 3 | 63221128138203 | 63221128138203 | 63221128138203 | equal | equal |
| 4 | exactIn | 0.008 | 42 | 4 | 54232351825158 | 54232351825158 | 54232351825158 | equal | equal |
| 5 | exactIn | 0.008 | 52 | 5 | 47030299728960 | 47030299728960 | 47030299728960 | equal | equal |
| 6 | exactIn | 0.008 | 61 | 6 | 41170904549021 | 41170904549021 | 41170904549021 | equal | equal |
| 7 | exactIn | 0.008 | 71 | 7 | 36111841608423 | 36111841608423 | 36111841608423 | equal | equal |
| 8 | exactIn | 0.02 | 81 | 8 | 73450840811368 | 73450840811368 | 73450840811368 | equal | equal |
| 9 | exactIn | 0.04 | 84 | 8 | 100562598698006 | 100562598698006 | 100562598698006 | equal | equal |
| 10 | partialFill | 0.2 | 88 | 8 | 110967934220017 | 110967934220017 | 110967934220017 | equal | equal |

Trades where simulator output differs from the chain: **0 of 11**.

### Migration result

DAMM v2 pool sqrt price: `18446744073709551`
DBC migration sqrt price (from config): `18446744073709551`
Equal: **yes**

## B. `create_config` of every preset, simulated against the deployed devnet program (no SOL needed)

`scripts/dryrun-config.ts` builds the real `create_config` transaction with the SDK, sets an arbitrary funded devnet system account as UNSIGNED fee payer
and calls `simulateTransaction` (sigVerify off): nothing is sent, nothing is signed, no funds can move. The simulation returns the new config account, which is decoded
and compared with the simulator's own derivations.

```
2026-10-01T20:17:30.051Z  fee payer (unsigned, simulation only) = DHLXnJdACTY83yKwnUkeoDjqi4QBbsYGa1v8tJL76ViX
devnet-micro: program accepted config; all 4 derived values equal the simulator
classic-meme: program accepted config; all 4 derived values equal the simulator
flat-start: program accepted config; all 4 derived values equal the simulator
long-curve: program accepted config; all 4 derived values equal the simulator
stock-pair-usdc: program accepted config; all 4 derived values equal the simulator
```

## C. Simulator vs the deployed program on real devnet pools (no SOL needed)

`scripts/conformance-devnet.ts` samples live pools from the 85k DBC pools on devnet (wSOL quote, linear or exponential scheduler), builds a `swap2` buy with the SDK,
simulates it against the deployed program (unsigned, nothing sent) and compares the program's post-state with the simulator replaying the same buy from the pool's pre-state.

| metric | value |
|---|---|
| runs | seed1: 12 pools; seed2: 100 pools; seed3: 60 pools; seed900: 6 pools |
| testedPools | 178 |
| match | 176 |
| mismatch | 0 |
| simError | 0 |
| chainError | 2 |
| matchedWithClockShift | 0 |
| withDynamicFee | 66 |
| outputTokenMode | 8 |
| exponentialScheduler | 30 |
| partialFill | 35 |
| scheduleStillDecaying | 6 |

Compared per pool: tokens received, sqrt price, quote reserve, partner fee, creator fee, protocol fee (all integers, exact equality required).

Non-matching or non-simulatable pools:

- `9EsBLFJ8pnMK61Av1uMLmBqGjaPt475fZEPpcdxMDuA8` chain-error: TEST ARTIFACT, not a simulator result: System Program InsufficientFunds while wrapping 4042.488002362 SOL of input (the simulated payer holds ~974 SOL). Such pools are now excluded by the sampler.
- `7ERSHkJncg4gx9udmK78NrQ1XhcNA2eHCF7x7r7zELjh` chain-error: TEST ARTIFACT, not a simulator result: System Program InsufficientFunds while wrapping 24024.454305104 SOL of input (the simulated payer holds ~974 SOL). Such pools are now excluded by the sampler.

Pool addresses tested (all on devnet): `3o11EdKa1BMNv6jVPE2b9GBvPeFGuabpnqFNBGs7sEWn`, `4uxUVpuqrCDE9rXhNs3WZ3xYduqqAaSPAxJVZowkWJjY`, `E1hwWjoHuVzunpZfZx4CaRSP8TBn1XL6QDGvq9t1dHyj`, `DMVTpkGVqP1SoD4xnhvEjdfT5DSexoXazkGponMabK8W`, `2f5BQUL9dncQVJF2iKXKsTm1bAZM6Jz5FHybYis7FTCW`, `34s8MVwmRa9to3v9wM4arfL6WjBCmhkx7Hfh4KUVL2aC`, `87CpZrVChKDbdiTRfkdQa6gVnMzugrsvt8xC5J3JNWsd`, `4U6DtpbWuSNPJkK6T43WLZHJ3FAvYpYskjT4QEd8Nn5o`, `DTg6p7cbN8iCS6XiZ9xpQNieh4opVad8tDYU242TwKQ6`, `9b6xdMfn3RWEXxcgdQSL3Bu8EH8KvYpggsVegQN5U53D`, `7fY8LMhEvAGrsQXeJM7kwQ2t3nWAVGmB23ebNcWzVVyW`, `7yt71Vccs3VfjWpeo1oJuY99yQY77mA28rHn6vLdAkiV`, `71ubQdWa3hRUTmjDuLaMy68L783ykG7JyZFDTWScTYxi`, `ES5itxBNWxFoS5JiTZuoYKcjAVh4EzmhzGjKRDwJBK4p`, `3P9jMaKL8LnDz7Gz2hr6HRq1aMFpvK3nWDFnPQLfSzWp`, `J8K2vTaoSiqPRw31Ves7v1GnC6TRqhvYZVMX6YpckbUZ`, `49fwhxCcYRrqE6RJY7fUcMxxA1vEWckN3wC8U6LSB7id`, `GxDhnWEcMmNrVB3KXnc1ab7vEFhxQRL78rjwM75UZobi`, `1TBCS6ovY7j6knJrgcRbVLXjXN4sRZDFQDHheeHFHuB`, `EMigPNGtVxzgNtY8AcBr51yGmAnYfHZqREuUW1wX5dvL`, `9jChdU5j9NMBsHPL9joV3gkLY8FMzQpeHdeYeezmdFoV`, `BwytKTfUYumZD2QP7SswriKf9excgA5EdGm1R9dnWLf1`, `7Qs6Bqr6pgx1DrKfzrC5evq9vrvKdVGvAp36VRz6dvos`, `E5AWu9nZBBDJXPNGtoDNjFPQT2TvEZATNP11mxyckzWp`, `2jaC16ZKB7V3ybavJzyNZrtLLgbcu7yoAByhvoT9T1jX`, `7RU69jManfbLwXzCnscH8M2pUicSM4YVRteX6n7AFNmn`, `CvM6TMRiwgb7DJT9TfWSbhcvgWqULQCLE8V4tZm7nNaQ`, `9npbw1b5xZziL2dRmbCXGS2VvSQostmjj1ELYtsk5HqR`, `C3TLJfgiTgVsyp3pQYnWx7orUafKFTPYCyoC6U4kpXD`, `FdDx6noMCR7xks8n2LdS9Sjwfnd5X6kHZpgs2XfpxuzW`, `9NQoAH1br83JgQVfRDaCvqojGCLb2LDxnTrmWsfWK11L`, `G9Jgz4CS1z1M24fD4DGn56YK9N5A8vYDwgLgxL87RwWP`, `HEVfeVJxXXHeNr923eYSJyyZaNGysLqWGPyu4yBmQsN7`, `9EsBLFJ8pnMK61Av1uMLmBqGjaPt475fZEPpcdxMDuA8`, `5xrm1vL29eCSa8UiF7Pk84N4LfcFSZ1DedoCy3jiGht3`, `3YTBWecGzVEupZt6hwZ2m4omM9CYisyc1yy15YzH2kfE`, `7ERSHkJncg4gx9udmK78NrQ1XhcNA2eHCF7x7r7zELjh`, `2ZwuSbJcRGKQC2ruw9mgGqxBcp4z7EwBH3Kx4Eb6oxSt`, `L5fphMotPPpbaYyqapswwFxMwUGhifX9Q79ZoyXU3JE`, `BY7TDvjYjp9DbgDkFiN9NhXNBq3NXBeMaeijyef9Tgdk`, `69TeYXMFptyjV4sbxhPzAXgTii2ZLdZrn7cvpbePQsQ8`, `ARJEc5sveaMxV8yfgudd3y1BF2kcSRgky6QNii1zzruR`, `HY9v3nPSrcb19kkgebDQs1LcjSXDJjz5SizCCgzSC54M`, `Gnx1aety4nno6Nn7ic4iKQgFh9VHsT41Ue1r3Yz1e44j`, `2SnLKvcybzf3twfw9DCuq3C1uC1wZJTjg2mu1PCKdppy`, `HKvkncSGAPWaDaDjCL4FPu58eoR2aUP5Zg53oBhdoQeD`, `7myTRfiXoqwvxwpaZ8yEevKY1u9iXU16EUWdGUZD3t3H`, `H1MbZFA4TCGH7S3vm25ZFa1pgwxJPeNFL2daYis2gNaW`, `GFDD1jiUmeZi5V5zA4farsQMppRft7oZsunoFj7VXcnR`, `FxygCgyNB2GP6hQJZouJabS28crJB5WTA5xBo2rUuZAG`, `JBdmvDi5HC3HrZGAZScbvQaZrNQLiB83MfqMiZN2kAwB`, `3hEtffYwtKHGB6EezNKSRBShgHEtUUEcKw2wn4qpPVZY`, `5F54f7QfDmCdJ7SLppSdbx3oYZ7CCQSQdeY5KgN4ty63`, `8hJ2n9hYAGfbEHsNL6GvZSBgHPqoyTPsYB1XYUecsgEA`, `3gVZoaAfiT8dYWRsnD7WX8gdTq9bHokfw9cYm1k2RsjW`, `AMZHx5muYw6ZNbs3LZeFQLgofJe6FqQm5pFjSnWUBFSC`, `FLG2KoBsgKKieuKnMuDg9rULpBio1J2CJkMsjRn4m6be`, `no5FRjDiCGcLB46HTvv8CA81jhJ2tFDsTXwn2rqnLaa`, `144RVx4b87EjjLrPgmwfFVkgUXSvTUe3qTgQpaj8A5W5`, `2tbVCmUf3XTCz6zjVTCuvzyiuigNRLeJgTGPBu7qxi37`, `84stBFcZTEDag7sE9jzqFRx35biyk6TQGXJHe1NM44F9`, `39zEUcWH5zwW2GcfMnDswnVxsmQSBy6QEnsyTBven9Tx`, `2cx6Yw5SNq1qCiKXyBBKeEgBJvSLFkGqLxmskC1pWR2c`, `7uJrmxgeUoedYT2YL5zxyxqt8dMkfxntVuAgR2rxhJnu`, `CQkYyxsw8ZK4uHkBWA6mtPE6yHn9HT2TNjp5F3MSef1c`, `EcJfTX1LoesiT3416MydvAAa9FPY6BNMkeaeFyRnM9En`, `H6o48ZYaqhRc4qXQmfHuXfnSdiDaN82dNAY5HtLGoCNz`, `CYJGBKB5cG2j8jEqUqHAbmJ1q8gj2kSzng8aodan25kg`, `5Lj7SukEAvBGga7UeCtqFpwo7ppTFMSt9NGaitzbsREr`, `C7HYWSbuPYek1VaAYTd1AvFsweLX6pFQbug8Npxgff7b`, `CEUi3ddtsHjkXUyaBE9oVjuiDiiwYRuUVWEGy8MVkLTE`, `F4fGgueq1sbasZkLVfSsqczCRtz4KNgdUv3HCv2vLqeL`, `BCrRAfauuUDBBYGen5nEJMXunC11GMz3ovj3TWM8JGoj`, `Dk66qBMSXBJCWFDRKvYfYzMdzt2ou5rrZy8R3BHusVs1`, `674JDmeQef5mxow3Yy7qNfs6pJr9Y7rNLw7BbLdDmdAP`, `6JDanoA3TuFho3QdXp7kzgQJ4vtciYjrh6p8nYe7j4Rk`, `8oegNHpEpuaBBr3jan1456D9GPBrjFjoF8KW1ktVDxFZ`, `x11L97d71rQZZ4rRfJ9F6zTiezdNWuUSYcaoNdca52L`, `EqMasyEtinPgZ8eDDU5Qo6Rm6B3iDMNt8frLtTjigynp`, `Fi6ixMfZ9rJWPxsvfy2QW7ywnW3B9Jpnuz7Wwh2vWLU7`, `3uiE4KDJp8nVnai8A387RkocXqyySrqkNUoM4ENToH1y`, `BbK1aDz6iHJfeCAMduT5nQjr3XuhPT568a7ib463KTgP`, `AhpCdacAywqVuM9yYo7sEBcJM2UTVnsBiuMAsfuF8tu`, `AqZQgi8YRceLbRxC7RGz3pYmHjKy7ZWWN1stfPJW4BZ1`, `GVgGWbaHypswMHZmi9yxiNfvNDAq2mGmf6czsQ9FYN4m`, `HzAZQvwsLnrBGMpzvU6zJ64t2F8YbwQnHrpLNSHTujs3`, `BwvShfPgydaxydjZbqKChvF1mWeFHBg9Gza5cWfYSyas`, `EMRFoPSHotKXce2WsfUBNC7PzvCzxBMq6ZsoPXYX7Kog`, `11iuqvcUBTL4FrqytcnJVoNgRoEh3mpDK2cLa41BV8n`, `2i7wQRu8pSyZrhEApqCWXvDybCeMu5ovr6DkU5pLHGgt`, `9HedGu1Jrud3fykL8z9kGUL4aPSGfsTtrcP7a2ioL3jc`, `E6aTNTdLnPeAYKjKHcnfb4psFH49Mf6ZqATVERUi4V5K`, `D68zphZnsV24WyEuRBv3Wjw7PYKCLEgqarnoYvyaSAGb`, `FYZSiTi7ujKJGKLEHfBFrNDfihHwFyqAE9RyhPd7kPJM`, `A9Rr1yA98g6XoBPmPbaUS3YrDxTCd2kSW4kVXM9xG9xS`, `J2vPLwmTASkjY13E8iRPK4f4EqxyTXcKtusuCAEENadN`, `13buB6vsYLFYXFBdYPbuXqGA3c85cjbMDsiy9JgFgrub`, `5EH2v9wsMMW9tPXtjK3t1jWGPiSn1ALbu5PdSUjzrvGA`, `9MNFJpzE7Vzms3mucUUhBmNaqH3bwGdAMdNncnMcsgPK`, `12gwFpeJwe6ZgttCp4LXaeKUSSAY7Bnv7pyZS8ssw5L9`, `77HmGWWV2r6JHZ2bAGjdGRsg6dchDsRnRAq9v4uSuugy`, `6kR8MMuhSEid83vNpAwWxJdoCsRtEsf7PSR3AaZqjPHL`, `sADc2uWY6ovvr9zmwwjaYGS9oKrjTiHoZB9Y1Qqyh9F`, `7svUsmrFehCmc15dYfosv54x3tWoMeHi9KtwntTvXSNs`, `4HN4VA53SAE9mq6Kx8NCCiUNFjVTcGgXmBCQoUqkpHM9`, `4iqx5NfYJU3ALoeD82ya2emCdiDySDKbBfRMRgXd9HdG`, `zYfA1vhCCNZTvYPnwkXpyoKPUHKoXppBtTiZNsiEBto`, `2q8beFgVdoZHQcEqpkaBoh2GioVSVb1AvuvoPfb67wdS`, `FguiTL5tagv6k6faANpeYdARKf2QZFKUDZ7oE3Lk6WLL`, `EGcpHcEspSCVaTsV6NSnRLWkpJDMMWuctFCCXDYjdaw1`, `5BfRSm2biKXZChpJ9y2mcdjLNW3tkrnn7be8KqJQmdSf`, `EFWAX6zKCoUcEhcAcEtKevuNwmNfpZwiSZV8o3TDDomH`, `56oEPsau6UTrD9NRhjydGzcSzCwtKrEV2UTgK4PTfsN9`, `AHRXQrD3xKKUPSCnzn4tMzW2mcXjmcL4f7uam597rp7`, `DrJ8REvp58jKb6bavkcJ3mbPejh71eNK5ugm3HnFG6EN`, `5vNf3CSBSNq2X34eHrhkvLov513NoypVmKU7VDAEhMvS`, `Ew1WFZygzkoZHgU3JMZ4xhSk51WiygouvvjLEPhVgRsf`, `EzbMXatEWdMQyDZ8cnmYDtrN8zog6qVjGEZ7wLBEYJQw`, `65Zr66WnHUHkqwWVk2QRR9ENoipmA18WGsUPnhhwx8Qj`, `DCkffNPJhyGuofxjTRBXsDsiAHZGoZfFKzjiS2BSanLY`, `HGHJk927xCAcMc8itHeEU5GbNeUzakr6Ac2nXUr44o6D`, `2gH3XCDNRtzdUotaVsDYhKXdv898ViBD3gSYKejfED1K`, `4og8Xw768wuc4biZMKJFeecVkoWTTKQfeveiMK9HY1CX`, `BM8AHmzU3TajP7UB2fEm7Xortojf8ua2QMJRt3oiJEL9`, `64siGDXV8i9PWTJXgLkBESf8Vq69tJcj9hkmG2YAGWeg`, `HEpx7VPDQd1BMebCn9cexHHzzm9wkMVu5FaCdawvot7B`, `8bf4DRTSQYow4BWNS7YpMs7JWP7aiV6J3hfHF8ErqSkx`, `6YdAPNf6N9UGANxhXgGj4x2DLZteqUCPAXTmorTse4SP`, `4PQTXJGd8sExAYZH6eMaYR2zLunWzzcQbkmYeBCfn9CP`, `FALM1SEtvjcJK2MfXesXWtMFNEE6eZ6BaUi3Zk9jgBbm`, `BHQhL4TfK7TTH4XzQcMedGDStd6UihRQr9CdEvySsGuW`, `8ZoML2QXNzs7ZHNupNPqRFo8qFxiWRsu7jdemWjyjEVG`, `D6ukAqiD2JWwMcfYYULvFDYMCsRB1kdLtXQ1bL6fZBD4`, `9VhXC1t9jeetuxBqM6T6YN9SVSpbkoFBbRUnuTidEEDb`, `Awtu5Byke9SNJK3Si3R6QCoEpcEzPNi6x29aZiy6oBbU`, `13FzJVXN419ajeTsjKDxZeCYpk5KotvohRyhh2DF6uur`, `5V9wUFYptPGLU4BTEyfdBCBEQ1SouJPySN4JXpugzd1w`, `DWBQXzGkidorHt75F1abGL9YxTN7tFwDmHWXWtQ9zH9G`, `6MKZ1ZAgk3Zt8RF7uJjZ87D4hqwxopHZeXFgZPV1dK2U`, `HsHFXX7C6W9ZzMfjgCwfHc2NSnYwBLGMhvTkhwiRY2Z9`, `HmUeXKZ89doudoX1KoC8mAGYK6G1tM6xtuUmB2jv7unS`, `Gv1azZnVQ1MykfZmJtwCDQA1wPByFGxCBtqjkjdU7tw6`, `BsohEcVH8DqWbjwtUBfpZnSv6s2Y1qvL3yHrhFdBH1M7`, `5c4YQgcdqiAeAwMLQkL7FJ1ELP5nYiKQiXh2Cq3YbCcm`, `H7PjRMQgDGE6XjVZ8sd2o8DWcH8gzd1pQ1yKYYQ54wM7`, `FDU1g6tVR1zhPBvDk4WK2jAChSXxrDohpQ88eS1Nxjtq`, `DJhGoVxGy8hkpgLPVx48wTfxjN25BrvVbh7Ph1CeoCNp`, `DG7YqAm6m1sXr2hf8kdTKsyY1pxU8Ew7haLR6B34oh58`, `41h4DPhGLJb7twWjAEofGvaN1jLKCvsTJXBBerPm1vjH`, `FaqdJKyMSy2Ggi891E47cnwqk7Ko5qKAAKPSERbSZTtH`, `CWvabk389N3FWwvwkR3CwjHWan5b2RDGG5UESV7KdALp`, `6YHRjaJxJ7g2v1YxRcPLmWV28CRp1ownTuFkg2FUxn7D`, `4v3nUir3tEvf1vW4e5aeff3DgVvNJLy6iwPztvkxmUiX`, `4nbSY9Jd7LAD15a9XgU5T4sXWHEjkKr4R6YZkhxsn8t3`, `7nxDMbBnVLWQ4aRPqAQm9rJyv9kZ6CtnaffP85QxZFuc`, `3stC3cRdNATnmBCKXGFmEydpsgmVM6QMbBY8JXzY4mf1`, `9Sz6aXKgCWaq2LsBJ6i7Y83YSuJ3j8hPdTqnxjkEuXSL`, `pV1vRFTLwCNjNxBqoWiiJqnVbndxF5KaTEv2arF5r9K`, `AFFLa5pycnLWE7LM9fjnNrQUKrY8XLvCKbK3duGq5JYa`, `9k7YRQmvhYipiMfjKBiRU1Tn6RH4yMBuefbucBb3f9Fs`, `7XGZh5tcKG8yqav18FZvqDRBLiXSaqH7kpjL59FhtY22`, `5T5gwjyR3UrsFtXW2TkNXNdqgoUajP5BpY64uETJobU9`, `8icp6AazUyw8iyhTxGnNt7QfkzYPaCRthYLFwBFBHDAL`, `6VbA5MbVu5pNHdZQkvJMe2jTqsbzUeeysbMUz4hm2CbW`, `9gs1ApT6WnyZJ6JoUvFfvbEpg1StFu8eeWUdYeNQ2Pky`, `4xenYiuq1gvA2DSQZFQqZePFQXjYBK1JcsTT7XLame26`, `EmaoLqpQa5gHWAPAK7jT7KdKPBzLDgbFvc6LG6WaBsme`, `9HpxaYfTCUDXNExYTngrXpwHGK9PrxFt5bHfAyyLZToB`, `Hy6HqRcDNhGFmRdMr89B2uRiNHDhNLydz258rXoc1zaz`, `GaywaKGLBw8RZ4mUkzwHM7ce9WdrEdFn7abpprsGofCH`, `GPsvXHaRLizEZDHt4xtLjdKp6PU8wjUYGjnTW9CMecKv`, `dciQV48szp64KcG858j83o5HYEQ46wNfGPyegiRs9zq`, `F74Nb6JffCo1RGRLwMQmdbEi7rBw74VgEPnh3VhABkau`, `EkNDMW9PfgPgPFyo9nN4nYpeZaWk2t1UU8XjXNyUvYWc`, `9FyEVCcRrNX9zCrLqDPkDwmwsvWD1EnEX9uL7A8Q8qcd`, `38xuTsoTLuPuc9D3z2vjKQrjw652CwYjzEehJvUMsbw1`, `CbU8gCMgPvfS5xhbQvA1oSnzK2dEfX25kfEKQVe3R6CV`, `8o7tuyNdPh7SG12gJy4HMgFRrUscLrX9AYoE74HZHcpV`

## D. `createPool` and `migrateToDammV2` against the deployed programs (dry run, no SOL needed)

Same technique (unsigned `simulateTransaction`): the SDK `creator.createPool` transaction is simulated against an existing devnet config, and the SDK
`migration.migrateToDammV2` transaction is simulated against devnet pools whose curve is complete but not yet migrated. The returned DAMM v2 pool account is decoded
and its opening `sqrtPrice` is compared with the DBC `migrationSqrtPrice`. Two pools were rejected with DBC error 6022 `NotPermitToDoThisAction`: both are in
`migrationProgress = 1` (PostBondingCurve) with locked base-token vesting, i.e. they need `createLocker` first (docs: Migration and liquidity). Our presets have no vesting.

```
devnet DBC pools: 85806
createPool dry run OK on config Fo8rvioaGvYstoJQG5g1QzbbiZ8JXx28N3UUdRp1PWQM: virtual pool 3oamMprbM3ftsMqxYuRhj9nXPBLYG1TpF7WL8YXATpta would start at sqrtPrice 1166676092093227 (config sqrtStartPrice 1166676092093227), creator = payer
completed-but-unmigrated SOL-quote DAMM-v2 pools on devnet: 833
migrateToDammV2 dry runs: 40 tried, 37 with DAMM v2 opening price equal to the DBC migration price, 30 with opening liquidity exactly equal to the simulator (the remaining ones differ by at most 6.67e-9 relative; probable cause, not verified: the program depos
  12NefYp7 migrate dry run OK: DAMM v2 pool Fsqo1Gsz sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=7591307750191757749040798129941 sim=7591307750191757749040798129942 (DIFF) [pool protocol_liquidity_migration_fee_bps=20]
  13VZvyU8 migrate dry run OK: DAMM v2 pool 9iQBGpMM sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=339970360046642954168293947028487 sim=339970360046642954168293947028487 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  13yJmg3F migrate dry run OK: DAMM v2 pool E2VgvX12 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=2720176608288601237636617761210 sim=2720176608288601237636617761210 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  14D7d681 migrate dry run OK: DAMM v2 pool js9QzaWK sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=4374988802307347304805525393294 sim=4374988808140665715659746347506 (DIFF) [pool protocol_liquidity_migration_fee_bps=0]
  6r7W2nHa migrate dry run OK: DAMM v2 pool J7mYUADN sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=39614081257127557110753548316 sim=39614081257127557110753548316 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  7pkZycab migrate dry run OK: DAMM v2 pool 7yt1QLD2 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  8i7h4Z9x migrate dry run OK: DAMM v2 pool 5J9iftyn sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1069123517741351517978937320297 sim=1069123517741351517978937320297 (equal) [pool protocol_liquidity_migration_fee_bps=20]
  AWP3YEPW migrate dry run OK: DAMM v2 pool xU6dcyor sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=29710560744761426489464336904 sim=29710560942831832775009888737 (DIFF) [pool protocol_liquidity_migration_fee_bps=0]
  D4ppcmoe migrate dry run error: rate-limiter base fee mode is deprecated for new configs and not supported by the simulator
  DtmG2QtE migrate dry run OK: DAMM v2 pool k2NyDj8j sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=4374988808140665715659746347505 sim=4374988808140665715659746347506 (DIFF) [pool protocol_liquidity_migration_fee_bps=0]
  EUTVs2BM migrate dry run OK: DAMM v2 pool ESibbNTZ sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=39614081257127557110753548316 sim=39614081257127557110753548316 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  FYUWPaED migrate dry run OK: DAMM v2 pool 7tVrhWzv sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=39614081257127557110753548316 sim=39614081257127557110753548316 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  JxWF9mZo migrate dry run OK: DAMM v2 pool 5pt7Ur5P sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  KEQttNHj migrate dry run OK: DAMM v2 pool 9jQG77pN sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  LZ8YL9w8 migrate dry run OK: DAMM v2 pool HWeHiLbs sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=13043818254837597967366815966400 sim=13043818254837597967366815966400 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  PgS8tffZ migrate dry run OK: DAMM v2 pool ANvQiFkQ sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=15975993268127766739876155571209 sim=15975993268127766739876155571209 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  QbJxiaEA migrate dry run OK: DAMM v2 pool Gj2uZe98 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=10805854266087801859680507414410 sim=10805854266087801859680507414410 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  QiqxHQPc migrate dry run OK: DAMM v2 pool Cd8fgz7G sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=14289646466431347585628164835890 sim=14289646466431347585628164835890 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  SR6x3onc migrate dry run OK: DAMM v2 pool BRU4oviw sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=82894079856044695838338312398844 sim=82894079856044695838338312398844 (equal) [pool protocol_liquidity_migration_fee_bps=20]
  T1pdsXZ3 migrate dry run OK: DAMM v2 pool 6rFbksFC sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=4374988802307347304805525393294 sim=4374988808140665715659746347506 (DIFF) [pool protocol_liquidity_migration_fee_bps=0]
  WVZzQ86r migrate dry run OK: DAMM v2 pool 5VMkDGFm sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=403077464974869953658175466067191 sim=403077464974869953658175466067191 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  WiSX3aXG migrate dry run OK: DAMM v2 pool EGArUsM3 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=25744377375593618587059692255189 sim=25744377375593618587059692255189 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  WnViEn1o migrate dry run OK: DAMM v2 pool 8pgECUp2 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  XUyivca7 migrate dry run OK: DAMM v2 pool B973DkCn sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=7591305427340781076902085002932 sim=7591305427340781076902085002932 (equal) [pool protocol_liquidity_migration_fee_bps=20]
  Y6sqWLRq migrate dry run OK: DAMM v2 pool 7SLQgvjq sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=5833318410854220954212995130009 sim=5833318410854220954212995130009 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  Z33KVQS7 migrate dry run OK: DAMM v2 pool 5GEjQuiQ sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=10805854266087801859680507414410 sim=10805854266087801859680507414410 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  aiW7WCDn migrate dry run OK: DAMM v2 pool hTaYZmzE sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=12912722956170556995348776038427 sim=12912722956170556995348776038427 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  bJzQWoRM migrate dry run OK: DAMM v2 pool 36renXm2 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=4374988802307347304805525393294 sim=4374988808140665715659746347506 (DIFF) [pool protocol_liquidity_migration_fee_bps=0]
  bQfqm5gn migrate dry run: rejected {"InstructionError":[0,{"Custom":6022}]} Program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN failed: custom program error: 0x1786
  ccA9GTh7 migrate dry run OK: DAMM v2 pool 6j4xhrH9 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  cdx38Ksb migrate dry run OK: DAMM v2 pool iWUooAVg sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=39614081257127557110753548316 sim=39614081257127557110753548316 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  g32cH48T migrate dry run OK: DAMM v2 pool 3qzM89hZ sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  ghJFQUre migrate dry run OK: DAMM v2 pool 8ddEpnbQ sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  hEXQpBWW migrate dry run OK: DAMM v2 pool 2L7Enbx5 sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=4374988802307347304805525393294 sim=4374988808140665715659746347506 (DIFF) [pool protocol_liquidity_migration_fee_bps=0]
  hiNuytX3 migrate dry run OK: DAMM v2 pool GDoZkT8U sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=534540967939490256809038305269544 sim=534540967939490256809038305269544 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  i5UC7q6p migrate dry run OK: DAMM v2 pool 8pZZTVGr sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  iaSX6Gfh migrate dry run: rejected {"InstructionError":[0,{"Custom":6022}]} Program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN failed: custom program error: 0x1786
  jK2dBfQQ migrate dry run OK: DAMM v2 pool 95qpyfVf sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=14289646466431347585628164835890 sim=14289646466431347585628164835890 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  oX9xqHhs migrate dry run OK: DAMM v2 pool 8eyvkjFN sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
  obcAhMk3 migrate dry run OK: DAMM v2 pool J6k6e8ZJ sqrtPrice == DBC migration sqrtPrice: yes; opening liquidity chain=1496210684015174156323843952027 sim=1496210684015174156323843952027 (equal) [pool protocol_liquidity_migration_fee_bps=0]
```
