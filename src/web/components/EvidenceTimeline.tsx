import type { EvidenceRecord } from "../map/briefing-fixture";

export function EvidenceTimeline({ evidence }: { evidence: readonly EvidenceRecord[] }) {
  return (
    <section className="evidence" aria-labelledby="evidence-title">
      <p className="sidecar-label" id="evidence-title">Evidence timeline</p>
      <ol className="evidence__list">
        {evidence.map((item) => (
          <li key={`${item.time}-${item.source}`}>
            <div className="evidence__meta">
              <time>{item.time}</time>
              <span className={`evidence__kind evidence__kind--${item.kind}`}>
                {item.kind}
              </span>
            </div>
            <p>{item.fact}</p>
            <a href={item.url} target="_blank" rel="noreferrer">
              {item.source} <span aria-hidden="true">↗</span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
