import {
  BRIEFING_CONFIDENCE_FLOOR,
  SOURCE_AUTHORITY,
  type ConfidenceSource,
} from "../model/source-policy";

export interface ConfidenceResult {
  confidence: number;
  eligibleForBriefing: boolean;
  sourceFamilyCount: number;
  components: {
    sourceAuthority: number;
    independentSupport: number;
    sourceIndependence: number;
    dataCompleteness: number;
  };
  reasons: string[];
}

const round = (value: number) => Math.round(value * 10) / 10;

export function calculateConfidence(sources: ConfidenceSource[]): ConfidenceResult {
  if (sources.length === 0) throw new Error("confidence_requires_source");
  if (sources.some(({ completeness }) => !Number.isFinite(completeness) || completeness < 0 || completeness > 100)) {
    throw new Error("invalid_source_completeness");
  }

  const families = new Set(sources.map(({ sourceFamily }) => sourceFamily));
  const sourceAuthority = Math.max(...sources.map(({ authority }) => SOURCE_AUTHORITY[authority]));
  const independentSupport = Math.min(100, Math.max(0, families.size - 1) * 50);
  const sourceIndependence = Math.min(100, 50 + Math.max(0, families.size - 1) * 25);
  const dataCompleteness = round(
    sources.reduce((total, { completeness }) => total + completeness, 0) / sources.length,
  );
  const officialStructured = sources.some(
    ({ authority, structured }) => authority === "official" && structured,
  );
  const weighted = round(
    sourceAuthority * 0.45 +
      independentSupport * 0.3 +
      sourceIndependence * 0.15 +
      dataCompleteness * 0.1,
  );
  const confidence = officialStructured ? Math.max(70, weighted) : weighted;
  const eligibleForBriefing = confidence >= BRIEFING_CONFIDENCE_FLOOR;
  const reasons = [
    `authority.${sourceAuthority}`,
    `families.${families.size}`,
    officialStructured ? "floor.official_structured" : null,
    eligibleForBriefing ? "gate.passed" : "gate.below_confidence",
  ].filter((reason): reason is string => reason !== null);

  return {
    confidence,
    eligibleForBriefing,
    sourceFamilyCount: families.size,
    components: { sourceAuthority, independentSupport, sourceIndependence, dataCompleteness },
    reasons,
  };
}
