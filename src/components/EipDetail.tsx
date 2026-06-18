import { IMPACT_LABELS, type Eip, type ImpactLevel, type StackCategory } from "../types.ts";

interface Props {
  eip: Eip;
  categories: StackCategory[];
  onClose: () => void;
}

export function EipDetail({ eip, categories, onClose }: Props) {
  const ranked = [...categories].sort((a, b) => eip.impact[b.id] - eip.impact[a.id]);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="detail">
        <button className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="detail-head">
          <span className="eip-num lg">EIP-{eip.number}</span>
          <span className={`status status-${eip.status.toLowerCase()}`}>{eip.status}</span>
        </div>
        <h2>{eip.title}</h2>
        {eip.description && <p className="detail-desc">{eip.description}</p>}
        <div className="detail-tags">
          <span className="eip-tag">{eip.type}</span>
          {eip.category && <span className="eip-tag">{eip.category}</span>}
        </div>

        <h3>Stack impact</h3>
        <ul className="impact-list">
          {ranked.map((c) => {
            const lv = eip.impact[c.id] as ImpactLevel;
            return (
              <li key={c.id} className={`impact-row impact-${lv}`}>
                <div className="impact-row-head">
                  <span className="impact-cat">{c.label}</span>
                  <span className={`impact-pill impact-${lv}`}>{IMPACT_LABELS[lv]}</span>
                </div>
                {lv > 0 && eip.why[c.id] && <p className="impact-why">{eip.why[c.id]}</p>}
              </li>
            );
          })}
        </ul>

        <a className="detail-link" href={eip.url} target="_blank" rel="noreferrer">
          Read the full EIP ↗
        </a>
      </aside>
    </>
  );
}
