// Per-audience Apple-Health-style category icons + system colors.
// Each tech-stack audience gets a colored rounded-square tile with a white glyph,
// mirroring the "Health Categories" list in the iOS Health app.

export const CAT_COLOR: Record<string, string> = {
  wallet: "#FF9500", // systemOrange
  l2: "#5856D6", // systemIndigo
  node: "#007AFF", // systemBlue
  rpc: "#30B0C7", // systemTeal
  indexer: "#34C759", // systemGreen
  contracts: "#AF52DE", // systemPurple
  staking: "#FF2D55", // systemPink
};

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...P}>
      {children}
    </svg>
  );
}

export function CatIcon({ id }: { id: string }) {
  switch (id) {
    case "wallet":
      return (
        <Svg>
          <rect x="3" y="6" width="18" height="13" rx="2.5" />
          <path d="M3 10h18" />
          <circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "l2":
      return (
        <Svg>
          <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
          <path d="M4 12l8 4.5 8-4.5" />
          <path d="M4 16.5L12 21l8-4.5" />
        </Svg>
      );
    case "node":
      return (
        <Svg>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3" />
        </Svg>
      );
    case "rpc":
      return (
        <Svg>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M7.5 7.5a6 6 0 000 9M16.5 7.5a6 6 0 010 9M4.7 4.7a10 10 0 000 14.6M19.3 4.7a10 10 0 010 14.6" />
        </Svg>
      );
    case "indexer":
      return (
        <Svg>
          <ellipse cx="12" cy="6" rx="7" ry="3" />
          <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
          <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </Svg>
      );
    case "contracts":
      return (
        <Svg>
          <path d="M8.5 8L5 12l3.5 4M15.5 8L19 12l-3.5 4M13 6l-2 12" />
        </Svg>
      );
    case "staking":
      return (
        <Svg>
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </Svg>
      );
    default:
      return null;
  }
}

export function CatTile({ id, size = 30 }: { id: string; size?: number }) {
  return (
    <span
      className="cat-tile"
      style={{ background: CAT_COLOR[id] ?? "#8E8E93", width: size, height: size }}
    >
      <CatIcon id={id} />
    </span>
  );
}
