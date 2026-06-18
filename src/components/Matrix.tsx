import { IMPACT_LABELS, type Eip, type ImpactLevel, type StackCategory } from "../types.ts";

interface Props {
  eips: Eip[];
  categories: StackCategory[];
  selected: number | null;
  onSelect: (n: number) => void;
}

export function Matrix({ eips, categories, selected, onSelect }: Props) {
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th className="col-eip">EIP</th>
            {categories.map((c) => (
              <th key={c.id} className="col-cat" title={c.blurb}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {eips.map((e) => (
            <tr
              key={e.number}
              className={selected === e.number ? "row selected" : "row"}
              onClick={() => onSelect(e.number)}
            >
              <td className="col-eip">
                <span className="eip-num">EIP-{e.number}</span>
                <span className="eip-title">{e.title}</span>
                {e.category && <span className="eip-tag">{e.category}</span>}
              </td>
              {categories.map((c) => {
                const lv = e.impact[c.id] as ImpactLevel;
                return (
                  <td key={c.id} className={`cell impact-${lv}`} title={e.why[c.id] || IMPACT_LABELS[lv]}>
                    {lv > 0 && <span className="cell-mark">{IMPACT_LABELS[lv][0]}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
