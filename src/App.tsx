import { useMemo, useState } from "react";
import rawData from "./data/matrix.json";
import { IMPACT_LABELS, type ImpactLevel, type MatrixData } from "./types.ts";
import { Matrix } from "./components/Matrix.tsx";
import { EipDetail } from "./components/EipDetail.tsx";

const data = rawData as unknown as MatrixData;

function fmtDate(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function App() {
  const upgrades = data.upgrades;
  const [activeUpgrade, setActiveUpgrade] = useState<number | "all">(
    upgrades.find((u) => u.activatedAt)?.metaEip ?? "all",
  );
  const [query, setQuery] = useState("");
  const [minImpact, setMinImpact] = useState<ImpactLevel>(1);
  const [selectedEip, setSelectedEip] = useState<number | null>(null);

  const visibleUpgrades = useMemo(
    () => (activeUpgrade === "all" ? upgrades : upgrades.filter((u) => u.metaEip === activeUpgrade)),
    [activeUpgrade, upgrades],
  );

  const q = query.trim().toLowerCase();

  const sections = useMemo(() => {
    return visibleUpgrades
      .map((u) => {
        const eips = u.eips
          .map((n) => data.eips[String(n)])
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
          .filter((e) => {
            if (!q) return true;
            return (
              String(e.number).includes(q) ||
              e.title.toLowerCase().includes(q) ||
              (e.category ?? "").toLowerCase().includes(q)
            );
          })
          .filter((e) => data.categories.some((c) => e.impact[c.id] >= minImpact))
          .sort((a, b) => a.number - b.number);
        return { upgrade: u, eips };
      })
      .filter((s) => s.eips.length > 0);
  }, [visibleUpgrades, q, minImpact]);

  const selected = selectedEip !== null ? data.eips[String(selectedEip)] : null;
  const totalEips = sections.reduce((n, s) => n + s.eips.length, 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="logo">♥</span>
          <div>
            <h1>EIP Impact Tracker</h1>
            <p className="tagline">
              How every Ethereum upgrade lands across the stack — wallets, L2s, nodes, RPC, indexers,
              contracts &amp; staking.
            </p>
          </div>
        </div>
        <div className="meta">
          <span>synced {new Date(data.generatedAt).toLocaleDateString()}</span>
          <span className="dot">·</span>
          <span>{Object.keys(data.eips).length} EIPs</span>
          <span className="dot">·</span>
          <span>{upgrades.length} upgrades</span>
        </div>
      </header>

      <div className="controls">
        <div className="tabs" role="tablist">
          <button
            className={activeUpgrade === "all" ? "tab active" : "tab"}
            onClick={() => setActiveUpgrade("all")}
          >
            All
          </button>
          {upgrades.map((u) => (
            <button
              key={u.metaEip}
              className={activeUpgrade === u.metaEip ? "tab active" : "tab"}
              onClick={() => setActiveUpgrade(u.metaEip)}
              title={`EIP-${u.metaEip} · ${u.status} · ${fmtDate(u.activatedAt)}`}
            >
              {u.name}
              {!u.activatedAt && <span className="badge">upcoming</span>}
            </button>
          ))}
        </div>

        <div className="filters">
          <input
            className="search"
            placeholder="Search EIP # or title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <label className="impact-filter">
            min impact
            <select
              value={minImpact}
              onChange={(e) => setMinImpact(Number(e.target.value) as ImpactLevel)}
            >
              {([1, 2, 3] as ImpactLevel[]).map((lv) => (
                <option key={lv} value={lv}>
                  {IMPACT_LABELS[lv]}+
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <main className="content">
        {totalEips === 0 ? (
          <div className="empty">No EIPs match these filters.</div>
        ) : (
          sections.map((s) => (
            <section key={s.upgrade.metaEip} className="upgrade-block">
              <div className="upgrade-head">
                <h2>{s.upgrade.name}</h2>
                <span className="upgrade-sub">
                  {s.upgrade.activatedAt
                    ? `activated ${fmtDate(s.upgrade.activatedAt)}`
                    : s.upgrade.status}{" "}
                  · EIP-{s.upgrade.metaEip} · {s.eips.length} shown
                </span>
              </div>
              <Matrix
                eips={s.eips}
                categories={data.categories}
                onSelect={(n) => setSelectedEip(n)}
                selected={selectedEip}
              />
            </section>
          ))
        )}
      </main>

      {selected && (
        <EipDetail eip={selected} categories={data.categories} onClose={() => setSelectedEip(null)} />
      )}
    </div>
  );
}
