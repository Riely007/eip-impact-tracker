// sync.ts — builds src/data/matrix.json from the live ethereum/EIPs repo.
//
// How it works:
//   1. Start from a seed set of Hardfork Meta EIPs (the newest known upgrades).
//   2. Each Meta EIP's `requires:` field chains to the *previous* upgrade's
//      Meta EIP, so we crawl the whole upgrade history automatically.
//   3. For each upgrade we parse the "Included EIPs" list + the Mainnet
//      activation timestamp.
//   4. We fetch every included EIP's frontmatter, then run the rule engine
//      (classify.ts) to score its impact on each tech-stack audience.
//
// Re-run anytime (`npm run sync`) to pick up new EIPs / new upgrades.

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { classify } from "./classify.ts";
import { STACK_CATEGORIES } from "../src/types.ts";
import type { Eip, MatrixData, Upgrade } from "../src/types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "matrix.json");
const RAW = "https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS";

// Newest known Hardfork Meta EIPs. The crawler follows `requires:` back through
// history, so you usually only need to add the *newest* meta here when a brand
// new upgrade is announced.
const SEED_METAS = [7773, 7607, 7600, 7569];

interface Frontmatter {
  [k: string]: string;
}

async function fetchEip(num: number): Promise<string | null> {
  const res = await fetch(`${RAW}/eip-${num}.md`);
  if (!res.ok) return null;
  return res.text();
}

function parseFrontmatter(md: string): Frontmatter {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm: Frontmatter = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const value = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    fm[line.slice(0, i).trim().toLowerCase()] = value;
  }
  return fm;
}

/** Pull the upgrade's human name out of "Hardfork Meta - Pectra". */
function upgradeName(title: string): string {
  const m = title.match(/Hardfork Meta(?:\s*[-–:]\s*)(.+)$/i);
  return (m ? m[1] : title).replace(/backfill.*/i, "").trim();
}

/**
 * Parse the included EIP numbers from a Meta EIP body. Handles three formats:
 *   - modern:  `### Included EIPs`
 *   - draft:   `### EIPs Scheduled for Inclusion`
 *   - legacy:  `- Included EIPs:`
 * Each section is scoped to the next header so we never pick up
 * Considered/Proposed/Declined EIPs from draft upgrades.
 */
function parseIncludedEips(md: string, selfNum: number): number[] {
  const nums = new Set<number>();
  const marker =
    /(?:^|\n)\s*(#{2,4}|[-*])?\s*(?:Included EIPs|(?:EIPs )?Scheduled for Inclusion)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(md))) {
    // Heading level of the marker; list-item markers count as level 2 so they
    // run until the next H2. Sub-headers (#### Core EIPs) stay inside scope.
    const level = m[1]?.startsWith("#") ? m[1].length : 2;
    const rest = md.slice(m.index + m[0].length);
    const stop = new RegExp(`\\n#{2,${level}}\\s`);
    const nextHeader = rest.search(stop);
    const scope = nextHeader === -1 ? rest : rest.slice(0, nextHeader);
    for (const mm of scope.matchAll(/EIP-(\d{1,5})/g)) nums.add(Number(mm[1]));
  }
  nums.delete(selfNum);
  return [...nums];
}

/** Mainnet activation unix timestamp from the activation table, if present. */
function parseActivation(md: string): number | null {
  const row = md.match(/\|\s*Mainnet\s*\|[^|]*\|\s*`?(\d{9,})`?\s*\|/i);
  return row ? Number(row[1]) : null;
}

/** From a Meta EIP's `requires`, find the previous Hardfork Meta EIP number. */
async function findPrevMeta(requires: string): Promise<number[]> {
  const candidates = requires
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  const metas: number[] = [];
  for (const n of candidates) {
    const md = await fetchEip(n);
    if (!md) continue;
    const fm = parseFrontmatter(md);
    if (/Hardfork Meta/i.test(fm.title || "")) metas.push(n);
  }
  return metas;
}

async function main() {
  console.log("Crawling Hardfork Meta EIPs from ethereum/EIPs ...");

  const upgrades: Upgrade[] = [];
  const eipNums = new Set<number>();
  const visited = new Set<number>();
  const queue = [...SEED_METAS];

  while (queue.length) {
    const metaNum = queue.shift()!;
    if (visited.has(metaNum)) continue;
    visited.add(metaNum);

    const md = await fetchEip(metaNum);
    if (!md) {
      console.warn(`  ! EIP-${metaNum} not found, skipping`);
      continue;
    }
    const fm = parseFrontmatter(md);
    if (!/Hardfork Meta/i.test(fm.title || "")) continue;

    // chain backwards to the previous upgrade(s) regardless — backfill metas
    // are a useful index of older upgrades even though we don't show them.
    if (fm.requires) {
      const prev = await findPrevMeta(fm.requires);
      prev.forEach((n) => !visited.has(n) && queue.push(n));
    }

    // "Backfill" metas bundle many historical upgrades as prose; skip the row.
    if (/Backfill/i.test(fm.title || "")) continue;

    const included = parseIncludedEips(md, metaNum);
    if (included.length === 0) {
      console.log(`  – ${upgradeName(fm.title!)} (EIP-${metaNum}): no parseable EIP list, skipped`);
      continue;
    }
    included.forEach((n) => eipNums.add(n));

    const name = upgradeName(fm.title || `EIP-${metaNum}`);
    console.log(`  • ${name} (EIP-${metaNum}): ${included.length} EIPs`);

    upgrades.push({
      name,
      metaEip: metaNum,
      status: fm.status || "Unknown",
      activatedAt: parseActivation(md),
      eips: included,
    });
  }

  console.log(`\nFetching & classifying ${eipNums.size} included EIPs ...`);
  const eips: Record<string, Eip> = {};
  for (const num of eipNums) {
    const md = await fetchEip(num);
    if (!md) continue;
    const fm = parseFrontmatter(md);
    const { impact, why } = classify({
      number: num,
      title: fm.title || `EIP-${num}`,
      description: fm.description || "",
      type: fm.type || "",
      category: fm.category || null,
    });
    eips[String(num)] = {
      number: num,
      title: fm.title || `EIP-${num}`,
      description: fm.description || "",
      type: fm.type || "",
      category: fm.category || null,
      status: fm.status || "",
      url: `https://eips.ethereum.org/EIPS/eip-${num}`,
      impact,
      why,
    };
  }

  // Order: upcoming drafts first, then activated newest→oldest, then any
  // historical upgrades whose activation date we couldn't parse.
  const rank = (u: Upgrade) =>
    u.activatedAt ?? (/draft|review|last call/i.test(u.status) ? Infinity : -1);
  upgrades.sort((a, b) => rank(b) - rank(a));

  const data: MatrixData = {
    generatedAt: new Date().toISOString(),
    categories: STACK_CATEGORIES,
    upgrades,
    eips,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n✓ Wrote ${OUT}`);
  console.log(`  ${upgrades.length} upgrades, ${Object.keys(eips).length} EIPs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
