import { useMemo, useState } from "react";
import rawData from "./data/matrix.json";
import { IMPACT_LABELS, type Eip, type ImpactLevel, type MatrixData } from "./types.ts";
import { Matrix } from "./components/Matrix.tsx";
import { EipDetail } from "./components/EipDetail.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { Favorites } from "./components/Favorites.tsx";

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
  const [activeCat, setActiveCat] = useState<string | null>(null);
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
          .filter((e): e is Eip => Boolean(e))
          .filter((e) => {
            if (!q) return true;
            return (
              String(e.number).includes(q) ||
              e.title.toLowerCase().includes(q) ||
              (e.category ?? "").toLowerCase().includes(q)
            );
          })
          .filter((e) =>
            activeCat
              ? e.impact[activeCat] >= minImpact
              : data.categories.some((c) => e.impact[c.id] >= minImpact),
          )
          .sort((a, b) => a.number - b.number);
        return { upgrade: u, eips };
      })
      .filter((s) => s.eips.length > 0);
  }, [visibleUpgrades, q, minImpact, activeCat]);

  // Favorites summarise the in-context EIPs (selected upgrade, or all of them).
  const favEips = useMemo(() => {
    const seen = new Set<number>();
    const out: Eip[] = [];
    for (const u of visibleUpgrades) {
      for (const n of u.eips) {
        if (seen.has(n)) continue;
        const e = data.eips[String(n)];
        if (e) {
          seen.add(n);
          out.push(e);
        }
      }
    }
    return out;
  }, [visibleUpgrades]);

  const headUpg = activeUpgrade === "all" ? null : visibleUpgrades[0];
  const selected = selectedEip !== null ? data.eips[String(selectedEip)] : null;
  const totalEips = sections.reduce((n, s) => n + s.eips.length, 0);
  const activeLabel = data.categories.find((c) => c.id === activeCat)?.label;

  return (
    <div className="hl-layout">
      <Sidebar
        categories={data.categories}
        query={query}
        onQuery={setQuery}
        activeCat={activeCat}
        onCat={setActiveCat}
      />

      <main className="hl-main">
        <div className="hero">
          <div className="hero-avatar">Ξ</div>
          <div className="hero-id">
            <h2 className="hero-name">{headUpg ? headUpg.name : "All Upgrades"}</h2>
            <p className="hero-sub">
              {headUpg
                ? `${headUpg.activatedAt ? `Activated ${fmtDate(headUpg.activatedAt)}` : headUpg.status} · EIP-${headUpg.metaEip}`
                : `${upgrades.length} network upgrades · ${Object.keys(data.eips).length} EIPs`}
            </p>
            <p className="hero-synced">
              Last synced {new Date(data.generatedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="main-pad">
          <div className="upgrade-bar">
            <button
              className={activeUpgrade === "all" ? "upill active" : "upill"}
              onClick={() => setActiveUpgrade("all")}
            >
              All
            </button>
            {upgrades.map((u) => (
              <button
                key={u.metaEip}
                className={activeUpgrade === u.metaEip ? "upill active" : "upill"}
                onClick={() => setActiveUpgrade(u.metaEip)}
                title={`EIP-${u.metaEip} · ${u.status} · ${fmtDate(u.activatedAt)}`}
              >
                {u.name}
                {!u.activatedAt && <span className="badge">soon</span>}
              </button>
            ))}
          </div>

          <div className="section-head">
            <h3>Favorites</h3>
            {activeCat && (
              <button className="clear-cat" onClick={() => setActiveCat(null)}>
                Showing {activeLabel} · clear ✕
              </button>
            )}
          </div>
          <Favorites
            categories={data.categories}
            eips={favEips}
            activeCat={activeCat}
            onCat={setActiveCat}
          />

          <div className="section-head">
            <h3>{activeCat ? `${activeLabel} impact` : "All EIPs"}</h3>
            <label className="impact-filter">
              Min impact
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

          {totalEips === 0 ? (
            <div className="empty">No EIPs match these filters.</div>
          ) : (
            sections.map((s) => (
              <section key={s.upgrade.metaEip} className="upgrade-block">
                {activeUpgrade === "all" && (
                  <div className="upgrade-head">
                    <h2>{s.upgrade.name}</h2>
                    <span className="upgrade-sub">
                      {s.upgrade.activatedAt
                        ? `activated ${fmtDate(s.upgrade.activatedAt)}`
                        : s.upgrade.status}{" "}
                      · {s.eips.length} shown
                    </span>
                  </div>
                )}
                <Matrix
                  eips={s.eips}
                  categories={data.categories}
                  focusCat={activeCat}
                  onSelect={(n) => setSelectedEip(n)}
                  selected={selectedEip}
                />
              </section>
            ))
          )}
        </div>
      </main>

      {selected && (
        <EipDetail eip={selected} categories={data.categories} onClose={() => setSelectedEip(null)} />
      )}
    </div>
  );
}
