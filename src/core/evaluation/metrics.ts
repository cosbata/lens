import type { Category, EventPhase } from "../model";
import { calculateEventScore } from "../score/event-score";

export type EvaluationSeed = {
  id: string;
  title: string;
  category: Category;
  geography: string[];
  sourceFamily: string;
  mergeIdentity: string;
  important: boolean;
  preferredOver?: string;
  ageHours?: number;
  features: [number, number, number, number, number, number, number];
};

export type EvaluationVariant = {
  id: string;
  ageHours: number;
  confidenceDelta: number;
  scoreDelta: number;
  important: boolean;
  rankTier: number;
};

export type EvaluationDataset = {
  version: string;
  frozenAt: string;
  seeds: EvaluationSeed[];
  variants: EvaluationVariant[];
};

export type EvaluationCandidate = {
  id: string;
  seedId: string;
  variantId: string;
  category: Category;
  expectedImportant: boolean;
  mergeIdentity: string;
  preferredOverId?: string;
  score: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 1_000) / 1_000;

export function expandEvaluationDataset(dataset: EvaluationDataset): EvaluationCandidate[] {
  return dataset.seeds.flatMap((seed) =>
    dataset.variants.map((variant) => {
      const adjusted = seed.features.map((value, index) =>
        clamp(value + (index === 6 ? variant.confidenceDelta : variant.scoreDelta)),
      ) as EvaluationSeed["features"];
      const now = dataset.frozenAt;
      const ageHours = seed.ageHours ?? variant.ageHours;
      const lastMaterialUpdateAt = new Date(Date.parse(now) - ageHours * 60 * 60 * 1_000).toISOString();
      const phase: EventPhase = variant.rankTier === 4 ? "resolved" : "active";
      const score = calculateEventScore({
        domainImpact: adjusted[0],
        urgency: adjusted[1],
        momentum: adjusted[2],
        geographicReach: adjusted[3],
        anomaly: adjusted[4],
        cascadeRelevance: adjusted[5],
        confidence: adjusted[6],
        category: seed.category,
        phase,
        lastMaterialUpdateAt,
        now,
      }).finalScore;
      return {
        id: `${seed.id}:${variant.id}`,
        seedId: seed.id,
        variantId: variant.id,
        category: seed.category,
        expectedImportant: seed.important && variant.important,
        mergeIdentity: seed.mergeIdentity,
        preferredOverId: seed.preferredOver
          ? `${seed.preferredOver}:${variant.id}`
          : undefined,
        score,
      };
    }),
  );
}

const classification = (candidates: EvaluationCandidate[], threshold: number) => {
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let trueNegative = 0;
  for (const candidate of candidates) {
    const predicted = candidate.score >= threshold;
    if (predicted && candidate.expectedImportant) truePositive += 1;
    else if (predicted) falsePositive += 1;
    else if (candidate.expectedImportant) falseNegative += 1;
    else trueNegative += 1;
  }
  const precision = truePositive / Math.max(1, truePositive + falsePositive);
  const recall = truePositive / Math.max(1, truePositive + falseNegative);
  return {
    truePositive,
    falsePositive,
    falseNegative,
    trueNegative,
    precision: round(precision),
    recall: round(recall),
    f1: round((2 * precision * recall) / Math.max(Number.EPSILON, precision + recall)),
  };
};

export function evaluateDataset(dataset: EvaluationDataset, threshold = 55) {
  const candidates = expandEvaluationDataset(dataset);
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const pairwiseCandidates = candidates.filter((candidate) => candidate.preferredOverId);
  const preferences = pairwiseCandidates.filter((candidate) => {
    const comparison = byId.get(candidate.preferredOverId!);
    return comparison !== undefined && candidate.score > comparison.score;
  }).length;
  const grouped = new Map<string, EvaluationCandidate[]>();
  for (const candidate of candidates) {
    grouped.set(candidate.mergeIdentity, [...(grouped.get(candidate.mergeIdentity) ?? []), candidate]);
  }
  const clusters = [...grouped.values()].map((members) => ({
      ...members.reduce((best, candidate) => candidate.score > best.score ? candidate : best),
      expectedImportant: members.some(({ expectedImportant }) => expectedImportant),
    }));
  const categories = [...new Set(candidates.map(({ category }) => category))].sort();

  return {
    datasetVersion: dataset.version,
    scoringVersion: "lens-v1",
    threshold,
    candidateCount: candidates.length,
    clusterCount: clusters.length,
    categoryCount: categories.length,
    classification: classification(candidates, threshold),
    clusteredClassification: classification(clusters, threshold),
    pairwise: {
      correct: preferences,
      total: pairwiseCandidates.length,
      accuracy: round(preferences / Math.max(1, pairwiseCandidates.length)),
    },
    categories: categories.map((category) => ({
      category,
      candidates: candidates.filter((candidate) => candidate.category === category).length,
      ...classification(
        candidates.filter((candidate) => candidate.category === category),
        threshold,
      ),
    })),
  };
}

export function renderEvaluationMarkdown(report: ReturnType<typeof evaluateDataset>) {
  const { classification, pairwise } = report;
  return [
    "# LENS evaluation",
    "",
    `Dataset: \`${report.datasetVersion}\` · Scoring: \`${report.scoringVersion}\` · Threshold: ${report.threshold}`,
    "",
    `Candidates: **${report.candidateCount}** across **${report.categoryCount}** categories.`,
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| Precision | ${classification.precision.toFixed(3)} |`,
    `| Recall | ${classification.recall.toFixed(3)} |`,
    `| F1 | ${classification.f1.toFixed(3)} |`,
    `| Clustered candidates | ${report.clusterCount} |`,
    `| Clustered precision | ${report.clusteredClassification.precision.toFixed(3)} |`,
    `| Clustered recall | ${report.clusteredClassification.recall.toFixed(3)} |`,
    `| Pairwise ranking accuracy | ${pairwise.accuracy.toFixed(3)} (${pairwise.correct}/${pairwise.total}) |`,
    "",
    "| Category | Candidates | Precision | Recall | F1 |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...report.categories.map(
      ({ category, candidates, precision, recall, f1 }) =>
        `| ${category} | ${candidates} | ${precision.toFixed(3)} | ${recall.toFixed(3)} | ${f1.toFixed(3)} |`,
    ),
    "",
  ].join("\n");
}
