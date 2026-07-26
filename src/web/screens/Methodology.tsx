import { SOURCE_AUTHORITY, BRIEFING_CONFIDENCE_FLOOR } from "../../core/model/source-policy";
import { EVENT_SCORE_VERSION, type EventScoreInput } from "../../core/score/event-score";
import { DISASTER_IMPACT_VERSION } from "../../core/score/impact-config";
import { ScoreBreakdown } from "../components/ScoreBreakdown";
import "../styles/methodology.css";

export const METHODOLOGY_EXAMPLE: EventScoreInput = {
  domainImpact: 80,
  urgency: 60,
  momentum: 40,
  geographicReach: 50,
  anomaly: 30,
  cascadeRelevance: 70,
  confidence: 80,
  category: "disasters",
  phase: "active",
  lastMaterialUpdateAt: "2026-07-25T00:00:00Z",
  now: "2026-07-25T12:00:00Z",
};

const SOURCE_LABELS = {
  official: "Official agency",
  institutional: "Public institution",
  specialist: "Verified specialist",
  established: "Established reporting",
  unknown: "Unknown or social-only",
} as const;

export function Methodology() {
  return (
    <article className="methodology">
      <header className="methodology__hero">
        <div>
          <p className="method-kicker">Public methodology · {EVENT_SCORE_VERSION}</p>
          <h1>Why this event,<br />and not another?</h1>
        </div>
        <div className="methodology__intro">
          <p>
            LENS does not rank events by article volume. It looks for material change,
            public impact, independent evidence, and recency.
          </p>
          <a href="#briefing">Return to today’s briefing <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section className="methodology__formula" aria-labelledby="formula-title">
        <div>
          <p className="method-kicker">01 / Importance</p>
          <h2 id="formula-title">The calculation is intentionally inspectable.</h2>
        </div>
        <pre>
          <code>{`base score =
impact × 0.40
+ urgency × 0.15
+ momentum × 0.15
+ geographic reach × 0.10
+ anomaly × 0.10
+ cascade relevance × 0.10

event score =
base score × confidence × freshness`}</code>
        </pre>
      </section>

      <ScoreBreakdown input={METHODOLOGY_EXAMPLE} />

      <section className="source-policy" aria-labelledby="source-policy-title">
        <div className="source-policy__copy">
          <p className="method-kicker">02 / Evidence</p>
          <h2 id="source-policy-title">Authority helps. Independence still matters.</h2>
          <p>
            A structured official observation can establish an event. Repeated copies
            of the same report remain one source family and do not create false confidence.
          </p>
          <p className="source-policy__floor">
            Minimum confidence for the public briefing <strong>{BRIEFING_CONFIDENCE_FLOOR}</strong>
          </p>
        </div>
        <ol className="authority-scale">
          {Object.entries(SOURCE_AUTHORITY)
            .sort((left, right) => right[1] - left[1])
            .map(([tier, score], index) => (
              <li key={tier}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{SOURCE_LABELS[tier as keyof typeof SOURCE_LABELS]}</p>
                <strong>{score}</strong>
              </li>
            ))}
        </ol>
      </section>

      <section className="methodology__limits" aria-labelledby="limits-title">
        <div>
          <p className="method-kicker">03 / Known limits</p>
          <h2 id="limits-title">Transparent does not mean perfect.</h2>
        </div>
        <ul>
          <li><strong>Coverage</strong><span>Some regions publish less structured public data.</span></li>
          <li><strong>Language</strong><span>English-language reporting is currently overrepresented.</span></li>
          <li><strong>Freshness</strong><span>A quiet event can decay before its full impact is known.</span></li>
          <li><strong>Comparison</strong><span>Scores compare attention priority, not human suffering.</span></li>
        </ul>
      </section>

      <footer className="methodology__versions">
        <p>Current scoring versions</p>
        <span>{EVENT_SCORE_VERSION}</span>
        <span>{DISASTER_IMPACT_VERSION}</span>
      </footer>
    </article>
  );
}
