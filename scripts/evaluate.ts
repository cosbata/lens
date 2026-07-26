import { readFile } from "node:fs/promises";
import {
  evaluateDataset,
  renderEvaluationMarkdown,
  type EvaluationDataset,
} from "../src/core/evaluation/metrics";

const valueAfter = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const path = valueAfter("--dataset") ?? "tests/fixtures/evaluation/v1.json";
const format = valueAfter("--format") ?? "json";
const dataset = JSON.parse(await readFile(path, "utf8")) as EvaluationDataset;
const report = evaluateDataset(dataset);

if (format === "markdown") console.log(renderEvaluationMarkdown(report));
else if (format === "json") console.log(JSON.stringify(report, null, 2));
else throw new Error(`unsupported_format:${format}`);
