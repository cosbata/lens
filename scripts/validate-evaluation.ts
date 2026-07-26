import { readFile } from "node:fs/promises";
import { CATEGORIES } from "../src/core/model";

type Seed = {
  id: string;
  title: string;
  occurredAt: string;
  category: string;
  geography: string[];
  sourceFamily: string;
  url: string;
  mergeIdentity: string;
  important: boolean;
  preferredOver?: string;
  ageHours?: number;
  features: number[];
};

type Variant = {
  id: string;
  sourceFamilySuffix: string;
  ageHours: number;
  confidenceDelta: number;
  scoreDelta: number;
  important: boolean;
  rankTier: number;
};

type Dataset = {
  version: string;
  frozenAt: string;
  sampleQuery?: string;
  adjudicationRule?: string;
  seeds: Seed[];
  variants: Variant[];
};

const fail = (message: string): never => {
  throw new Error(`invalid_evaluation_dataset:${message}`);
};
const unique = (values: string[]) => new Set(values).size === values.length;
const validDate = (value: string) => Number.isFinite(Date.parse(value));

const validate = async (path: string) => {
  const dataset = JSON.parse(await readFile(path, "utf8")) as Dataset;
  if (!["evaluation-v1", "production-adjudication-v1"].includes(dataset.version) || !validDate(dataset.frozenAt)) {
    fail(`${path}.header`);
  }
  if (!Array.isArray(dataset.seeds) || !Array.isArray(dataset.variants)) fail(`${path}.collections`);
  if (!unique(dataset.seeds.map(({ id }) => id)) || !unique(dataset.variants.map(({ id }) => id))) {
    fail(`${path}.duplicate_id`);
  }

  const seedIds = new Set(dataset.seeds.map(({ id }) => id));
  for (const seed of dataset.seeds) {
    if (!seed.id || !seed.title || !validDate(seed.occurredAt)) fail(`${path}.seed.${seed.id}.identity`);
    if (!CATEGORIES.includes(seed.category as (typeof CATEGORIES)[number])) {
      fail(`${path}.seed.${seed.id}.category`);
    }
    if (!seed.geography.length || !seed.sourceFamily || !seed.mergeIdentity || typeof seed.important !== "boolean") {
      fail(`${path}.seed.${seed.id}.labels`);
    }
    if (seed.preferredOver && (!seedIds.has(seed.preferredOver) || seed.preferredOver === seed.id)) {
      fail(`${path}.seed.${seed.id}.preference`);
    }
    if (seed.ageHours !== undefined && (!Number.isFinite(seed.ageHours) || seed.ageHours < 0)) {
      fail(`${path}.seed.${seed.id}.age`);
    }
    try {
      new URL(seed.url);
    } catch {
      fail(`${path}.seed.${seed.id}.provenance`);
    }
    if (
      seed.features.length !== 7 ||
      seed.features.some((value) => !Number.isFinite(value) || value < 0 || value > 100)
    ) {
      fail(`${path}.seed.${seed.id}.features`);
    }
  }

  for (const variant of dataset.variants) {
    if (
      !variant.id ||
      !variant.sourceFamilySuffix ||
      !Number.isFinite(variant.ageHours) ||
      variant.ageHours < 0 ||
      !Number.isFinite(variant.confidenceDelta) ||
      !Number.isFinite(variant.scoreDelta) ||
      typeof variant.important !== "boolean" ||
      !Number.isInteger(variant.rankTier) ||
      variant.rankTier < 1 ||
      variant.rankTier > 4
    ) {
      fail(`${path}.variant.${variant.id}`);
    }
  }

  const candidates = dataset.seeds.length * dataset.variants.length;
  const categories = new Set(dataset.seeds.map(({ category }) => category));
  if (dataset.version === "evaluation-v1" && (candidates < 200 || categories.size < 8)) {
    fail(`${path}.calibration_coverage`);
  }
  if (
    dataset.version === "production-adjudication-v1" &&
    (candidates < 8 || !dataset.sampleQuery || !dataset.adjudicationRule)
  ) {
    fail(`${path}.production_provenance`);
  }

  return {
    path,
    valid: true,
    version: dataset.version,
    seeds: dataset.seeds.length,
    variants: dataset.variants.length,
    candidates,
    categories: [...categories].sort(),
    provenanceUrls: new Set(dataset.seeds.map(({ url }) => url)).size,
  };
};

const paths = process.argv[2]
  ? [process.argv[2]]
  : ["tests/fixtures/evaluation/v1.json", "tests/fixtures/evaluation/production.json"];
console.log(JSON.stringify(await Promise.all(paths.map(validate)), null, 2));
