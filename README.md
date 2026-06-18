# EIP Impact Tracker

Track how every Ethereum protocol upgrade lands across the **tech stack** — wallets,
L2s / rollups, node & client teams, RPC providers, indexers, contract devs, and
staking / validator operators.

The impact matrix is built **automatically from the live [`ethereum/EIPs`](https://github.com/ethereum/EIPs) repo**.
Re-run the sync after any upgrade and the matrix refreshes itself.

![matrix](https://eips.ethereum.org) <!-- screenshot placeholder -->

## How it works

```
ethereum/EIPs  ──crawl──▶  scripts/sync.ts  ──▶  src/data/matrix.json  ──▶  React UI
```

1. **Crawl** — `sync.ts` starts from a seed of the newest **Hardfork Meta** EIPs
   (e.g. Glamsterdam → Fusaka → Pectra → Dencun). Each meta's `requires:` field
   chains back to the previous upgrade, so the whole upgrade history is discovered
   automatically.
2. **Parse** — for each upgrade it reads the *Included EIPs* list (handling the
   modern, draft, and legacy formats) and the Mainnet activation timestamp.
3. **Classify** — every included EIP is scored against each tech-stack audience by a
   transparent rule engine (`scripts/classify.ts`): a baseline from the EIP's formal
   category (Core / Networking / Interface / ERC), keyword boosts (blob, account
   abstraction, JSON-RPC, staking, …), and explicit overrides for high-signal EIPs.
   Every score carries a short rationale, so the matrix is auditable rather than a
   black box.
4. **Render** — a Vite + React UI shows the matrix as a heatmap, filterable by
   upgrade, search, and minimum impact, with a per-EIP detail drawer.

## Usage

```bash
npm install
npm run sync     # fetch from ethereum/EIPs → src/data/matrix.json
npm run dev      # start the UI at http://localhost:5173
npm run build    # production build into dist/
```

`src/data/matrix.json` is committed, so the app runs offline. Run `npm run sync`
to refresh it.

## Keeping it current

The crawler walks history backwards from `SEED_METAS` in `scripts/sync.ts`. When a
brand-new upgrade is announced, its Hardfork Meta EIP usually `requires:` the
previous one — so it's picked up as soon as you add its number (one line) to the
seed, or once a newer meta references it. To fully automate refreshes, wire
`npm run sync` into a scheduled CI job (e.g. a daily GitHub Action that commits the
regenerated `matrix.json`).

## Tuning the impact scores

The scores are heuristics meant to give a sensible first pass straight from the repo.
To pin a specific EIP, add it to `OVERRIDES` in `scripts/classify.ts`. To change how a
whole class of EIPs scores, edit `BASE` (formal-category baselines) or `KEYWORD_BOOSTS`.

## Resources

- **[Forkcast](https://forkcast.org)** — the Ethereum Foundation's upgrade tracker
  (by Nixo). Catalogs upcoming forks (Glamsterdam, Hegota, …), the EIPs in each,
  decision logs, ACD calls, and devnet status. Closest prior art to this project and
  a strong candidate data source — its per-fork EIP groupings could supplement /
  cross-check the `requires:` crawl, and its "headliner" framing pairs well with the
  per-audience impact angle here.
- **[ethereum/EIPs](https://github.com/ethereum/EIPs)** — canonical EIP source this
  tool crawls. See the [Hardfork Meta EIPs](https://eips.ethereum.org/meta) for the
  per-upgrade inclusion lists.
- **[eips.ethereum.org](https://eips.ethereum.org)** — rendered EIPs (each row links
  here).
- **[ethereum/execution-specs](https://github.com/ethereum/execution-specs)** &
  **[consensus-specs](https://github.com/ethereum/consensus-specs)** — where some
  older upgrades' EIP lists actually live (why a few historical forks show no rows).

## Tech-stack audiences

| Column | Who it's for |
| --- | --- |
| Wallet | Wallets & signing UX (MetaMask, Rabby, smart accounts) |
| L2 / Rollup | Rollups & data-availability consumers |
| Node / Client | Execution & consensus client implementers |
| RPC Provider | RPC & API infra (Infura, Alchemy, self-hosted) |
| Indexer / Data | Indexers, explorers & analytics (The Graph, Etherscan) |
| Contract Dev | Smart-contract & tooling developers (Solidity, Foundry) |
| Staking / Validator | Validators, staking pools & node operators |
