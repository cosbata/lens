import {
  calculateEventScore,
  type EventScoreInput,
} from "../../core/score/event-score";

const COMPONENTS = [
  ["Domain impact", "domainImpact", 0.4],
  ["Urgency", "urgency", 0.15],
  ["Momentum", "momentum", 0.15],
  ["Geographic reach", "geographicReach", 0.1],
  ["Anomaly", "anomaly", 0.1],
  ["Cascade relevance", "cascadeRelevance", 0.1],
] as const;

export function ScoreBreakdown({ input }: { input: EventScoreInput }) {
  const result = calculateEventScore(input);

  return (
    <section className="score-breakdown" aria-labelledby="score-example-title">
      <div className="score-breakdown__heading">
        <div>
          <p className="method-kicker">Reproducible example</p>
          <h2 id="score-example-title">One score, shown end to end.</h2>
        </div>
        <p className="score-breakdown__final">
          <span>Final score</span>
          {result.finalScore}
        </p>
      </div>

      <div className="score-breakdown__components">
        {COMPONENTS.map(([label, key, weight]) => {
          const value = input[key];
          return (
            <div className="score-component" key={key}>
              <div>
                <p>{label}</p>
                <span>{value} × {weight.toFixed(2)}</span>
              </div>
              <div className="score-component__rule" aria-hidden="true">
                <span style={{ width: `${value}%` }} />
              </div>
              <strong>{Math.round(value * weight * 10) / 10}</strong>
            </div>
          );
        })}
      </div>

      <div className="score-equation" aria-label="Final score calculation">
        <p><span>Weighted base</span><strong>{result.baseScore}</strong></p>
        <b aria-hidden="true">×</b>
        <p><span>Confidence</span><strong>{result.confidenceMultiplier}</strong></p>
        <b aria-hidden="true">×</b>
        <p><span>Freshness</span><strong>{result.freshnessFactor}</strong></p>
        <b aria-hidden="true">=</b>
        <p className="score-equation__result"><span>Event score</span><strong>{result.finalScore}</strong></p>
      </div>
      <p className="score-breakdown__version">
        Computed by {result.version} · Disasters / active · 12 hours since material update
      </p>
    </section>
  );
}
