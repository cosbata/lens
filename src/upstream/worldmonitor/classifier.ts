/*
 * Keyword severity and category policy adapted from World Monitor's
 * server/worldmonitor/news/v1/_classifier.ts at commit
 * d9ef780be65caf6669d352dade30fd2d777048eb.
 * Copyright (C) 2024-2026 Elie Habib. SPDX-License-Identifier: AGPL-3.0-only
 */
import { CATEGORIES, type Category, type EventType } from "../../core/model";

export type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

export interface NewsClassification {
  primaryCategory: Category;
  eventType: EventType;
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

const EVENT_TYPE_KEYWORDS: Array<[EventType, string[]]> = [
  ["airstrike", ["airstrike", "air strike"]],
  ["missile-drone", ["drone strike", "missile strike"]],
  ["ceasefire", ["ceasefire"]],
  ["displacement", ["displaced", "displacement", "flee their homes"]],
  ["election", ["election", "referendum"]],
  ["sanction", ["sanction", "sanctions"]],
  ["treaty", ["treaty"]],
  ["cyberattack", ["cyber attack", "ransomware", "data breach"]],
  ["terrorism", ["terror attack", "terrorist"]],
  ["civil-unrest", ["civil unrest", "protest", "riots"]],
  ["earthquake", ["earthquake", "quake"]],
  ["wildfire", ["wildfire", "forest fire"]],
  ["flood", ["flood", "flooding"]],
  ["storm", ["hurricane", "typhoon", "cyclone", "tropical storm"]],
  ["volcano", ["volcano", "volcanic eruption"]],
  ["landslide", ["landslide"]],
  ["drought", ["drought"]],
  ["heat", ["heatwave", "heat wave"]],
  ["pollution", ["oil spill", "pollution"]],
  ["rates", ["interest rate", "rate cut", "rate hike"]],
  ["inflation", ["inflation"]],
  ["employment", ["unemployment", "job losses"]],
  ["market-shock", ["market crash", "market selloff"]],
  ["oil-gas", ["oil field", "oil refinery", "natural gas", "lng"]],
  ["electricity", ["electricity grid", "power grid"]],
  ["nuclear", ["nuclear power", "nuclear plant", "reactor"]],
  ["fuel-shortage", ["fuel shortage"]],
  ["port", ["port closure", "port disruption"]],
  ["shipping", ["shipping route", "vessel", "freight"]],
  ["aviation", ["airport closure", "flight disruption"]],
  ["rail-road", ["rail disruption", "road closure"]],
  ["manufacturing", ["factory shutdown", "manufacturing disruption"]],
  ["food", ["food shortage", "grain shortage"]],
  ["outbreak", ["disease outbreak", "epidemic", "pandemic"]],
  ["public-health-alert", ["health emergency", "public health alert"]],
  ["healthcare-disruption", ["hospital disruption", "healthcare disruption"]],
  ["medicine-shortage", ["medicine shortage", "drug shortage"]],
  ["outage", ["cloud outage", "internet outage", "major outage", "service down"]],
  ["telecom", ["telecom outage", "mobile network outage"]],
  ["datacenter", ["data center outage", "datacenter outage"]],
  ["satellite", ["satellite outage", "satellite failure"]],
  ["critical-infrastructure", ["critical infrastructure"]],
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
  const eventType = EVENT_TYPE_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => includesTerm(normalized, keyword)))?.[0] ?? "unknown";
  return {
    primaryCategory,
    eventType,
    relatedCategories,
    level,
    confidence: matchedKeywords.length === 0
      ? 0.4
      : Math.min(0.95, 0.62 + matchedKeywords.length * 0.08),
    matchedKeywords,
    source: matchedKeywords.length === 0 ? "feed_hint" : "keyword",
  };
}
