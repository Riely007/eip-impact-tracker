import type { StackCategory } from "../types.ts";
import { CatTile } from "../icons.tsx";

interface Props {
  categories: StackCategory[];
  query: string;
  onQuery: (q: string) => void;
  activeCat: string | null;
  onCat: (id: string | null) => void;
}

export function Sidebar({ categories, query, onQuery, activeCat, onCat }: Props) {
  return (
    <aside className="sidebar">
      <h1 className="sidebar-title">
        <span className="logo">♥</span> Health
      </h1>

      <input
        className="sidebar-search"
        placeholder="Search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />

      <button
        className={activeCat === null ? "nav-item active" : "nav-item"}
        onClick={() => onCat(null)}
      >
        <span className="nav-glyph" style={{ background: "#FF2D55" }}>
          ♥
        </span>
        Summary
      </button>

      <div className="sidebar-group">Tech Stack</div>
      <ul className="cat-list">
        {categories.map((c) => (
          <li key={c.id}>
            <button
              className={activeCat === c.id ? "nav-item active" : "nav-item"}
              onClick={() => onCat(c.id)}
            >
              <CatTile id={c.id} size={26} />
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
