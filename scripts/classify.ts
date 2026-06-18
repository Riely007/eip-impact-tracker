// Rule engine: given an EIP's metadata, estimate how strongly it impacts each
// tech-stack audience. This is intentionally transparent & tunable — every
// score carries a short rationale so the matrix is auditable, not a black box.
//
// Scores are heuristic. They get you a sensible first-pass matrix straight from
// the EIP repo; high-signal EIPs can be pinned in OVERRIDES below.

import type { ImpactLevel } from "../src/types.ts";
import { STACK_CATEGORIES } from "../src/types.ts";

export interface ClassifyInput {
  number: number;
  title: string;
  description: string;
  type: string; // "Standards Track" | "Meta" | "Informational"
  category: string | null; // "Core" | "Networking" | "Interface" | "ERC"
}

export interface ClassifyResult {
  impact: Record<string, ImpactLevel>;
  why: Record<string, string>;
}

const CAT_IDS = STACK_CATEGORIES.map((c) => c.id);

function blank(): Record<string, ImpactLevel> {
  return Object.fromEntries(CAT_IDS.map((id) => [id, 0 as ImpactLevel]));
}

function raise(
  impact: Record<string, ImpactLevel>,
  why: Record<string, string>,
  id: string,
  level: ImpactLevel,
  reason: string,
) {
  if (level > impact[id]) {
    impact[id] = level;
    why[id] = reason;
  } else if (level === impact[id] && level > 0 && !why[id]) {
    why[id] = reason;
  }
}

// Baseline impact derived from the EIP's formal classification.
const BASE: Record<string, Partial<Record<string, [ImpactLevel, string]>>> = {
  Core: {
    node: [3, "Core protocol change — clients must implement it"],
    staking: [2, "Validators run clients that must adopt the change"],
    l2: [2, "L2s track L1 EVM/consensus semantics"],
    contracts: [2, "May change EVM behaviour contracts rely on"],
    rpc: [1, "Indirect: served data may shift"],
    indexer: [1, "Indirect: derived data may shift"],
  },
  Networking: {
    node: [3, "Changes the p2p / sync protocol clients speak"],
    rpc: [2, "Infra nodes must stay in sync with peers"],
    staking: [2, "Validator nodes depend on networking"],
    indexer: [1, "Relies on synced nodes upstream"],
  },
  Interface: {
    rpc: [3, "Defines the JSON-RPC / API surface providers expose"],
    wallet: [2, "Wallets consume these RPC interfaces"],
    indexer: [2, "Indexers read chain data through these interfaces"],
    contracts: [1, "Tooling talks to nodes via these interfaces"],
    node: [1, "Clients implement the interface"],
  },
  ERC: {
    contracts: [3, "Application-layer standard for contract authors"],
    wallet: [2, "Wallets often need to support new token/account standards"],
    indexer: [1, "Indexers may track the new standard's events"],
  },
};

// Keyword → (category, level, reason). Boosts on top of the baseline.
type Boost = [category: string, level: ImpactLevel, reason: string];
const KEYWORD_BOOSTS: Array<[patterns: RegExp, boosts: Boost[]]> = [
  [/\b(blob|danksharding|4844|4488|7594|peerdas|calldata)\b/i, [
    ["l2", 3, "Blob / data-availability change — central to rollup economics"],
    ["rpc", 2, "Must serve/handle blob-related data"],
    ["indexer", 2, "Blob & calldata accounting affects indexing"],
  ]],
  [/\b(account abstraction|eoa|7702|4337|authorization|set code|smart account|paymaster)\b/i, [
    ["wallet", 3, "Reshapes account model & signing flows"],
    ["contracts", 3, "New account/authorization semantics for builders"],
  ]],
  [/\b(precompile|opcode|evm|bytecode|eof|transient storage|mcopy)\b/i, [
    ["contracts", 3, "New/changed EVM capability for contract authors"],
    ["node", 3, "Clients implement the EVM change"],
  ]],
  [/\b(gas|fee|pricing|cost|repricing|base fee|1559)\b/i, [
    ["contracts", 2, "Gas/fee change affects contract economics"],
    ["wallet", 2, "Fee estimation & tx UX shifts"],
    ["rpc", 2, "Fee-related RPC responses change"],
  ]],
  [/\b(json-rpc|eth_|getlogs|trace|filter|namespace|api)\b/i, [
    ["rpc", 3, "Directly changes the RPC API surface"],
    ["indexer", 3, "Indexers depend on these endpoints"],
  ]],
  [/\b(log|event|receipt|bloom|topic)\b/i, [
    ["indexer", 3, "Logs/receipts are the indexer's primary feed"],
  ]],
  [/\b(deposit|withdrawal|validator|staking|exit|attestation|churn|consolidat|effective balance|bls|beacon)\b/i, [
    ["staking", 3, "Directly changes staking / validator lifecycle"],
    ["node", 2, "Consensus-layer change clients implement"],
  ]],
  [/\b(transaction type|tx type|signature|signing|eip-?712|typed data|nonce)\b/i, [
    ["wallet", 3, "Changes how wallets build & sign transactions"],
    ["rpc", 2, "New tx type must be accepted/forwarded"],
  ]],
  [/\b(address|create2|contract creation|init code)\b/i, [
    ["contracts", 2, "Affects contract deployment / addressing"],
  ]],
  [/\b(history|block hash|state expiry|witness|stateless|verkle)\b/i, [
    ["node", 3, "State/history model change for clients"],
    ["indexer", 2, "Historical data availability changes"],
    ["rpc", 2, "Affects what historical data can be served"],
  ]],
];

// High-signal EIPs where the heuristic is worth pinning explicitly.
const OVERRIDES: Record<number, Partial<Record<string, [ImpactLevel, string]>>> = {
  4844: {
    l2: [3, "Proto-danksharding — the core L1 scaling lever for rollups"],
    rpc: [3, "New blob tx type & blob endpoints to serve"],
    indexer: [2, "Blob sidecars & blob gas to track"],
    wallet: [2, "Blob-carrying tx awareness for advanced flows"],
    node: [3, "Major execution + consensus change"],
    contracts: [2, "BLOBHASH opcode & blob base fee"],
  },
  7702: {
    wallet: [3, "EOAs can run contract code — redefines wallet UX"],
    contracts: [3, "Delegation/authorization model for builders"],
    indexer: [2, "Delegated EOAs change how accounts are interpreted"],
    rpc: [2, "New tx type to accept and surface"],
    node: [3, "New transaction type clients must implement"],
  },
  1559: {
    wallet: [3, "Base-fee + tip fee model reshaped tx UX"],
    rpc: [3, "New fee fields across the RPC surface"],
    contracts: [2, "Fee market & BASEFEE opcode"],
    indexer: [2, "Base fee per block to index"],
    node: [3, "Fee market is consensus-critical"],
  },
};

export function classify(input: ClassifyInput): ClassifyResult {
  const impact = blank();
  const why: Record<string, string> = {};
  const haystack = `${input.title} ${input.description}`;

  // 1) baseline from formal category (Standards Track) — Meta/Informational get none
  const base = input.category ? BASE[input.category] : undefined;
  if (base) {
    for (const [id, val] of Object.entries(base)) {
      if (val) raise(impact, why, id, val[0], val[1]);
    }
  }

  // 2) keyword boosts
  for (const [pattern, boosts] of KEYWORD_BOOSTS) {
    if (pattern.test(haystack)) {
      for (const [id, level, reason] of boosts) raise(impact, why, id, level, reason);
    }
  }

  // 3) explicit overrides win
  const override = OVERRIDES[input.number];
  if (override) {
    for (const [id, val] of Object.entries(override)) {
      if (val) {
        impact[id] = val[0];
        why[id] = val[1];
      }
    }
  }

  return { impact, why };
}
