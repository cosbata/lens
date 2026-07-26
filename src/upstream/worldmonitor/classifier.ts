/*
 * Keyword severity and category policy adapted from World Monitor's
 * server/worldmonitor/news/v1/_classifier.ts at commit
 * d9ef780be65caf6669d352dade30fd2d777048eb.
 * Copyright (C) 2024-2026 Elie Habib. SPDX-License-Identifier: AGPL-3.0-only
 */
import { CATEGORIES, type Category } from "../../core/model";

export type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

export interface NewsClassification {
  primaryCategory: Category;
  relatedCategories: Category[];
  level: ThreatLevel;
  confidence: number;
  matchedKeywords: string[];
  source: "keyword" | "feed_hint";
}

const KEYWORDS: Record<Category, string[]> = {
  conflict: [
    "airstrike", "air strike", "armed conflict", "bombing", "ceasefire",
    "drone strike", "invasion", "missile strike", "troops deployed", "war",
  ],
  "politics-diplomacy": [
    "ambassador", "diplomatic", "election", "negotiation", "referendum",
    "sanctions", "summit", "treaty", "united nations",
  ],
  security: [
    "assassination", "coup", "cyber attack", "data breach", "hostage",
    "ransomware", "terror attack", "terrorist", "zero-day",
  ],
  disasters: [
    "earthquake", "eruption", "evacuation order", "flood", "hurricane",
    "landslide", "tsunami", "typhoon", "volcano",
  ],
  "climate-environment": [
    "climate change", "deforestation", "drought", "emissions", "heatwave",
    "oil spill", "pollution", "sea level", "wildfire",
  ],
  economy: [
    "central bank", "gdp", "inflation", "interest rate", "market crash",
    "recession", "tariff", "unemployment",
  ],
  energy: [
    "electricity grid", "energy market", "lng", "natural gas", "nuclear power",
    "oil field", "oil price", "oil refinery", "opec", "pipeline",
  ],
  "supply-chains": [
    "cargo", "freight", "logistics", "port closure", "shipping route",
    "strait", "supply chain", "vessel", "warehouse",
  ],
  health: [
    "disease", "epidemic", "health emergency", "infection", "outbreak",
    "pandemic", "public health", "vaccine", "virus",
  ],
  "technology-infrastructure": [
    "artificial intelligence", "blackout", "cloud outage", "critical vulnerability",
    "internet outage", "major outage", "power outage", "semiconductor",
    "service down",
  ],
};

const LEVEL_KEYWORDS: Array<[ThreatLevel, string[]]> = [
  ["critical", [
    "biological attack", "chemical attack", "declaration of war", "genocide",
    "health emergency", "nuclear attack", "nuclear meltdown", "nuclear strike",
  ]],
  ["high", [
    "airstrike", "cyber attack", "earthquake", "hurricane", "invasion",
    "missile strike", "ransomware", "terror attack", "tsunami", "typhoon",
  ]],
  ["medium", [
    "blackout", "ceasefire", "diplomatic crisis", "flood", "outbreak",
    "pipeline", "port closure", "protest", "recession", "wildfire",
  ]],
  ["low", [
    "agreement", "climate change", "election", "interest rate", "summit",
    "tariff", "treaty", "vaccine",
  ]],
];

function includesTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u")
    .test(text);
}

export function classifyNews(
  text: string,
  hint: Category,
): NewsClassification {
  const normalized = text.toLowerCase();
  const scores = new Map<Category, number>([[hint, 1]]);
  const matched = new Map<Category, string[]>();
  for (const category of CATEGORIES) {
    for (const keyword of KEYWORDS[category]) {
      if (!includesTerm(normalized, keyword)) continue;
      scores.set(category, (scores.get(category) ?? 0) + 3);
      matched.set(category, [...(matched.get(category) ?? []), keyword]);
    }
  }
  const ranked = [...scores].sort(
    ([leftCategory, leftScore], [rightCategory, rightScore]) =>
      rightScore - leftScore
      || CATEGORIES.indexOf(leftCategory) - CATEGORIES.indexOf(rightCategory),
  );
  const primaryCategory = ranked[0][0];
  const matchedKeywords = matched.get(primaryCategory) ?? [];
  const relatedCategories = ranked
    .filter(([category, score]) =>
      category !== primaryCategory && score >= Math.max(3, ranked[0][1] - 2))
    .slice(0, 2)
    .map(([category]) => category);
  const level = LEVEL_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => includesTerm(normalized, keyword)))?.[0] ?? "info";
  return {
    primaryCategory,
    relatedCategories,
    level,
    confidence: matchedKeywords.length === 0
      ? 0.4
      : Math.min(0.95, 0.62 + matchedKeywords.length * 0.08),
    matchedKeywords,
    source: matchedKeywords.length === 0 ? "feed_hint" : "keyword",
  };
}
