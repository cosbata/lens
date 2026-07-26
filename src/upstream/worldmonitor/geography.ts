/*
 * Strategic hub data and country references adapted from World Monitor at
 * commit d9ef780be65caf6669d352dade30fd2d777048eb.
 * Copyright (C) 2024-2026 Elie Habib. SPDX-License-Identifier: AGPL-3.0-only
 */
import type { Geometry } from "../../core/model";
import countryBboxesJson from "./country-bboxes.json";
import countryNamesJson from "./country-names.json";

export type LocationPrecision =
  | "provider_exact"
  | "named_hub"
  | "country_approximate"
  | "unmapped";

export interface NewsLocation {
  geometry: Geometry | null;
  affectedCountries: string[];
  precision: LocationPrecision;
  displayName?: string;
  matchedTerms: string[];
  referenceVersion: string;
}

interface Hub {
  name: string;
  country?: string;
  coordinates: [number, number];
  terms: string[];
}

const REFERENCE_VERSION = "worldmonitor-d9ef780";
const HUBS: Hub[] = [
  { name: "Bunia", country: "CD", coordinates: [30.252, 1.559], terms: ["bunia"] },
  { name: "Ituri Province", country: "CD", coordinates: [29.5, 1.85], terms: ["ituri province", "ituri"] },
  { name: "North Kivu", country: "CD", coordinates: [28.75, -0.5], terms: ["north kivu"] },
  { name: "South Kivu", country: "CD", coordinates: [28.65, -2.5], terms: ["south kivu"] },
  { name: "Washington, DC", country: "US", coordinates: [-77.0369, 38.9072], terms: ["washington dc", "white house", "pentagon", "capitol hill"] },
  { name: "Moscow", country: "RU", coordinates: [37.6173, 55.7558], terms: ["moscow", "kremlin"] },
  { name: "Beijing", country: "CN", coordinates: [116.4074, 39.9042], terms: ["beijing"] },
  { name: "Brussels", country: "BE", coordinates: [4.3517, 50.8503], terms: ["brussels", "european commission"] },
  { name: "London", country: "GB", coordinates: [-0.1278, 51.5074], terms: ["london", "downing street"] },
  { name: "Kyiv", country: "UA", coordinates: [30.5234, 50.4501], terms: ["kyiv", "kiev"] },
  { name: "Tehran", country: "IR", coordinates: [51.389, 35.6892], terms: ["tehran"] },
  { name: "Jerusalem", country: "IL", coordinates: [35.2137, 31.7683], terms: ["jerusalem"] },
  { name: "Gaza", country: "PS", coordinates: [34.47, 31.5], terms: ["gaza", "rafah", "khan younis"] },
  { name: "Strait of Hormuz", coordinates: [56.5, 26.5], terms: ["strait of hormuz", "hormuz"] },
  { name: "Red Sea", coordinates: [38, 20], terms: ["red sea", "bab el-mandeb", "bab al-mandab"] },
  { name: "Suez Canal", country: "EG", coordinates: [32.3, 30.5], terms: ["suez canal", "suez"] },
  { name: "Panama Canal", country: "PA", coordinates: [-79.68, 9.08], terms: ["panama canal"] },
  { name: "Taiwan Strait", coordinates: [119.5, 24.5], terms: ["taiwan strait"] },
  { name: "South China Sea", coordinates: [114, 12], terms: ["south china sea", "spratly islands", "scarborough shoal"] },
  { name: "Tokyo", country: "JP", coordinates: [139.6917, 35.6895], terms: ["tokyo"] },
  { name: "Seoul", country: "KR", coordinates: [126.978, 37.5665], terms: ["seoul"] },
  { name: "New Delhi", country: "IN", coordinates: [77.209, 28.6139], terms: ["new delhi"] },
  { name: "Mumbai", country: "IN", coordinates: [72.8777, 19.076], terms: ["mumbai"] },
  { name: "Singapore", country: "SG", coordinates: [103.8198, 1.3521], terms: ["singapore"] },
  { name: "Nairobi", country: "KE", coordinates: [36.8219, -1.2921], terms: ["nairobi"] },
  { name: "Lagos", country: "NG", coordinates: [3.3792, 6.5244], terms: ["lagos"] },
  { name: "Paris", country: "FR", coordinates: [2.3522, 48.8566], terms: ["paris", "elysee palace"] },
  { name: "Berlin", country: "DE", coordinates: [13.405, 52.52], terms: ["berlin", "bundestag"] },
  { name: "Warsaw", country: "PL", coordinates: [21.0122, 52.2297], terms: ["warsaw"] },
  { name: "Istanbul", country: "TR", coordinates: [28.9784, 41.0082], terms: ["istanbul", "bosphorus"] },
  { name: "Cairo", country: "EG", coordinates: [31.2357, 30.0444], terms: ["cairo"] },
  { name: "Riyadh", country: "SA", coordinates: [46.6753, 24.7136], terms: ["riyadh"] },
  { name: "Dubai", country: "AE", coordinates: [55.2708, 25.2048], terms: ["dubai", "jebel ali"] },
  { name: "Doha", country: "QA", coordinates: [51.531, 25.2854], terms: ["doha"] },
  { name: "Baghdad", country: "IQ", coordinates: [44.3661, 33.3152], terms: ["baghdad"] },
  { name: "Kabul", country: "AF", coordinates: [69.2075, 34.5553], terms: ["kabul"] },
  { name: "Islamabad", country: "PK", coordinates: [73.0479, 33.6844], terms: ["islamabad"] },
  { name: "Jakarta", country: "ID", coordinates: [106.8456, -6.2088], terms: ["jakarta"] },
  { name: "Manila", country: "PH", coordinates: [120.9842, 14.5995], terms: ["manila"] },
  { name: "Ottawa", country: "CA", coordinates: [-75.6972, 45.4215], terms: ["ottawa"] },
  { name: "Mexico City", country: "MX", coordinates: [-99.1332, 19.4326], terms: ["mexico city"] },
  { name: "Brasilia", country: "BR", coordinates: [-47.8919, -15.7975], terms: ["brasilia", "brasília"] },
  { name: "Buenos Aires", country: "AR", coordinates: [-58.3816, -34.6037], terms: ["buenos aires"] },
];

const COUNTRY_REPRESENTATIVE_POINTS: Record<string, [number, number]> = {
  AE: [54.3773, 24.4539],
  AF: [69.2075, 34.5553],
  AR: [-58.3816, -34.6037],
  BE: [4.3517, 50.8503],
  BR: [-47.8919, -15.7975],
  CA: [-75.6972, 45.4215],
  CN: [116.4074, 39.9042],
  EG: [31.2357, 30.0444],
  FR: [2.3522, 48.8566],
  GB: [-0.1278, 51.5074],
  ID: [106.8456, -6.2088],
  IL: [35.2137, 31.7683],
  IN: [77.209, 28.6139],
  IQ: [44.3661, 33.3152],
  IR: [51.389, 35.6892],
  JP: [139.6917, 35.6895],
  KE: [36.8219, -1.2921],
  KR: [126.978, 37.5665],
  MX: [-99.1332, 19.4326],
  NG: [3.3792, 6.5244],
  PA: [-79.5199, 8.9824],
  PH: [120.9842, 14.5995],
  PK: [73.0479, 33.6844],
  PL: [21.0122, 52.2297],
  PS: [35.2137, 31.7683],
  QA: [51.531, 25.2854],
  RU: [37.6173, 55.7558],
  SA: [46.6753, 24.7136],
  SG: [103.8198, 1.3521],
  TR: [32.8597, 39.9334],
  UA: [30.5234, 50.4501],
  US: [-77.0369, 38.9072],
};

const countryNames = countryNamesJson as Record<string, string>;
const countryBboxes = countryBboxesJson as Record<string, number[]>;
const blockedAliases = new Set(["georgia", "chad", "jordan", "turkey"]);
const explicitAliases: Array<[string, string]> = [
  ["united states", "US"], ["u s", "US"], ["usa", "US"],
  ["united kingdom", "GB"], ["u k", "GB"], ["uk", "GB"],
  ["south korea", "KR"], ["north korea", "KP"], ["uae", "AE"],
  ["türkiye", "TR"], ["turkiye", "TR"], ["turkey", "TR"],
];
const countryAliases = [
  ...explicitAliases,
  ...Object.entries(countryNames)
    .filter(([name]) => name.length >= 4 && !blockedAliases.has(name)),
].sort(([left], [right]) => right.length - left.length);

function normalize(value: string) {
  return ` ${value.toLowerCase().normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()} `;
}

function includesTerm(text: string, term: string) {
  return text.includes(normalize(term));
}

export function inferNewsLocation(text: string): NewsLocation {
  const normalized = normalize(text);
  const hubMatches = HUBS.flatMap((hub) => {
    const term = [...hub.terms].sort((a, b) => b.length - a.length)
      .find((candidate) => includesTerm(normalized, candidate));
    return term ? [{ hub, term }] : [];
  });
  if (hubMatches.length === 1) {
    const [{ hub, term }] = hubMatches;
    return {
      geometry: { type: "Point", coordinates: hub.coordinates },
      affectedCountries: hub.country ? [hub.country] : [],
      precision: "named_hub",
      displayName: hub.name,
      matchedTerms: [term],
      referenceVersion: REFERENCE_VERSION,
    };
  }
  if (hubMatches.length > 1) {
    return {
      geometry: null,
      affectedCountries: [...new Set(hubMatches.flatMap(({ hub }) => hub.country ? [hub.country] : []))],
      precision: "unmapped",
      displayName: "Multiple named locations",
      matchedTerms: hubMatches.map(({ term }) => term),
      referenceVersion: REFERENCE_VERSION,
    };
  }
  const country = countryAliases.find(([alias]) => includesTerm(normalized, alias));
  if (country) {
    const [alias, code] = country;
    if (code === "CD" && includesTerm(normalized, "eastern areas")) {
      return {
        geometry: { type: "Point", coordinates: [28.5, -1] },
        affectedCountries: [code],
        precision: "named_hub",
        displayName: "Eastern DR Congo",
        matchedTerms: [alias, "eastern areas"],
        referenceVersion: REFERENCE_VERSION,
      };
    }
    const bbox = countryBboxes[code];
    const representative = COUNTRY_REPRESENTATIVE_POINTS[code]
      ?? (bbox?.length === 4
        ? [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2] as [number, number]
        : undefined);
    if (representative) {
      return {
        geometry: {
          type: "Point",
          coordinates: representative,
        },
        affectedCountries: [code],
        precision: "country_approximate",
        displayName: alias.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase()),
        matchedTerms: [alias],
        referenceVersion: REFERENCE_VERSION,
      };
    }
  }
  return {
    geometry: null,
    affectedCountries: [],
    precision: "unmapped",
    matchedTerms: [],
    referenceVersion: REFERENCE_VERSION,
  };
}
