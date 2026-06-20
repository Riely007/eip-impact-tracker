import type { Eip, StackCategory } from "../types.ts";
import { CatTile, CAT_COLOR } from "../icons.tsx";

interface Props {
  categories: StackCategory[];
  eips: Eip[];
  activeCat: string | null;
  onCat: (id: string | null) => void;
}

const LEVEL = [
  { lv: 3, color: "#FF3B30", label: "high" },
  { lv: 2, color: "#FF9500", label: "med" },
  { lv: 1, color: "#34C759", label: "low" },
] as const;

export function Favorites({ categories, eips, activeCat, onCat }: Props) {
  return (
    <div className="fav-grid">
      {categories.map((c) => {
        const counts = { 3: 0, 2: 0, 1: 0 } as Record<number, number>;
        for (const e of eips) {
          const lv = e.impact[c.id];
          if (lv >= 1) counts[lv]++;
        }
        const impacted = counts[3] + counts[2] + counts[1];
        const active = activeCat === c.id;
        return (
          <button
            key={c.id}
            className={active ? "fav-card active" : "fav-card"}
            onClick={() => onCat(active ? null : c.id)}
          >
            <div className="fav-top">
              <span className="fav-head">
                <CatTile id={c.id} size={22} />
                <span className="fav-label" style={{ color: CAT_COLOR[c.id] }}>
                  {c.label}
                </span>
              </span>
              <span className="fav-chevron">›</span>
            </div>
            <div className="fav-metric">
              <span className="fav-num">{impacted}</span>
              <span className="fav-unit">EIPs affected</span>
            </div>
            <div className="fav-bars">
              {LEVEL.map(({ lv, color, label }) => (
                <span key={lv} className="fav-stat" title={`${counts[lv]} ${label}`}>
                  <span className="fav-dot" style={{ background: color }} />
                  {counts[lv]}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
