import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  evaluateDataset,
  expandEvaluationDataset,
  renderEvaluationMarkdown,
  type EvaluationDataset,
} from "../../../src/core/evaluation/metrics";

const dataset = JSON.parse(
  readFileSync("tests/fixtures/evaluation/v1.json", "utf8"),
) as EvaluationDataset;
const production = JSON.parse(
  readFileSync("tests/fixtures/evaluation/production.json", "utf8"),
) as EvaluationDataset;

describe("evaluation metrics", () => {
  it("expands and scores the frozen corpus deterministically", () => {
    const candidates = expandEvaluationDataset(dataset);
    expect(candidates).toHaveLength(200);
    expect(candidates).toEqual(expandEvaluationDataset(dataset));
    expect(candidates.every(({ score }) => score >= 0 && score <= 100)).toBe(true);
  });

  it("reports classification, pairwise ranking, and category coverage", () => {
    const report = evaluateDataset(dataset);
    expect(report.candidateCount).toBe(200);
    expect(report.categoryCount).toBe(10);
    expect(report.classification.f1).toBeGreaterThan(0);
    expect(report.pairwise.total).toBe(200);
    expect(report.categories.every(({ candidates }) => candidates === 20)).toBe(true);
    expect(renderEvaluationMarkdown(report)).toContain("| Pairwise ranking accuracy |");
  });

  it("evaluates source observations after merging duplicate incident identities", () => {
    const report = evaluateDataset(production);
    expect(report.candidateCount).toBe(12);
    expect(report.clusterCount).toBe(7);
    expect(report.pairwise.total).toBe(1);
    expect(report.clusteredClassification.recall).toBe(1);
    expect(renderEvaluationMarkdown(report)).toContain("| Clustered candidates | 7 |");
  });
});
