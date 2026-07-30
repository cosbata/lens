import { createHash } from "node:crypto";
import {
  parseEvidence,
  parseObservation,
  type Category,
  type Evidence,
  type Observation,
} from "../../core/model";
import { inferNewsLocation } from "../../upstream/worldmonitor/geography";
import { classifyNews } from "../../upstream/worldmonitor/classifier";

type JsonRecord = Record<string, unknown>;

const CATEGORY: Record<string, Category> = {
  conflict: "conflict",
  military: "conflict",
  diplomacy: "politics-diplomacy",
  politics: "politics-diplomacy",
  security: "security",
  infrastructure: "technology-infrastructure",
  energy: "energy",
  economy: "economy",
};
const SEVERITY = new Set(["low", "medium", "high", "critical"]);

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid_worldmonitor:${field}`);
  }
  return value as JsonRecord;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`invalid_worldmonitor:${field}`);
  }
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`invalid_worldmonitor:${field}`);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  return text(value, field);
}

function time(value: unknown, field: string) {
  const result = new Date(number(value, field));
  if (!Number.isFinite(result.getTime())) throw new Error(`invalid_worldmonitor:${field}`);
  return result.toISOString();
}

function pickFirstText(value: unknown, fields: string[], field: string): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const obj = value as Record<string, unknown>;
  for (const candidate of fields) {
    const maybe = obj[candidate];
    if (maybe === undefined) continue;
    const parsed = optionalText(maybe, `${field}.${candidate}`);
    if (parsed) return parsed;
  }
  return undefined;
}

function newsCategory(bucket: string, threatCategory?: string): Category {
  const value = `${threatCategory ?? ""} ${bucket}`.toLowerCase();
  if (/(war|conflict|military|defen[cs]e)/.test(value)) return "conflict";
  if (/(cyber|security|crisis|terror|crime)/.test(value)) return "security";
  if (/(earthquake|wildfire|storm|flood|disaster|hazard)/.test(value)) return "disasters";
  if (/(climate|environment|nature|weather)/.test(value)) return "climate-environment";
  if (/(health|disease|outbreak|medical)/.test(value)) return "health";
  if (/(energy|oil|gas|nuclear|commodity)/.test(value)) return "energy";
  if (/(shipping|logistics|supply|port|trade)/.test(value)) return "supply-chains";
  if (/(tech|ai|software|hardware|cloud|outage|science)/.test(value)) {
    return "technology-infrastructure";
  }
  if (/(finance|market|econom|bank|crypto|forex|bond|business)/.test(value)) return "economy";
  return "politics-diplomacy";
}

function newsTime(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return fallback;
}

function newsNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function normalizeWorldMonitorIranEvents(
  responseValue: unknown,
  fetchedAt: string,
): Array<{ observation: Observation; evidence: Evidence }> {
  const response = record(responseValue, "response");
  if (!Array.isArray(response.events)) throw new Error("invalid_worldmonitor:events");
  time(response.scrapedAt, "scrapedAt");
  return response.events.map((value, index) => {
    const event = record(value, `events.${index}`);
    const id = text(event.id, `events.${index}.id`);
    const upstreamCategory = text(event.category, `events.${index}.category`).toLowerCase();
    const primaryCategory = CATEGORY[upstreamCategory];
    if (!primaryCategory) throw new Error(`invalid_worldmonitor:events.${index}.category`);
    const severity = text(event.severity, `events.${index}.severity`).toLowerCase();
    if (!SEVERITY.has(severity)) {
      throw new Error(`invalid_worldmonitor:events.${index}.severity`);
    }
    const sourceUrl = text(event.sourceUrl, `events.${index}.sourceUrl`);
    const publishedAt = time(event.timestamp, `events.${index}.timestamp`);
    const title = text(event.title, `events.${index}.title`);
    const locationName = text(event.locationName, `events.${index}.locationName`);
    const classification = classifyNews(`${title} ${locationName}`, primaryCategory);
    const observation = parseObservation({
      id: `worldmonitor:iran:${id}`,
      provider: "worldmonitor",
      providerSourceId: id,
      sourceFamily: "liveuamap",
      url: sourceUrl,
      occurredAt: publishedAt,
      fetchedAt,
      title,
      description: `${locationName} · ${upstreamCategory}`,
      primaryCategory,
      eventType: classification.eventType,
      relatedCategories: primaryCategory === "conflict" ? ["security"] : [],
      geometry: {
        type: "Point",
        coordinates: [
          number(event.longitude, `events.${index}.longitude`),
          number(event.latitude, `events.${index}.latitude`),
        ],
      },
      globalScope: false,
      affectedCountries: ["IR"],
      measurements: { severity },
      extension: {
        upstreamCategory,
        upstreamEndpoint: "/api/conflict/v1/list-iran-events",
      },
    });
    const evidence = parseEvidence({
      id: `${observation.id}:evidence`,
      observationId: observation.id,
      sourceId: id,
      sourceFamily: "liveuamap",
      url: sourceUrl,
      publishedAt,
      fetchedAt,
      title,
      imageUrl: pickFirstText(event, ["imageUrl", "image", "thumbnail", "image_url", "mediaImageUrl"], "image"),
      imageAlt: pickFirstText(event, ["imageAlt", "mediaCaption", "caption"], "imageAlt"),
      imageCredit: pickFirstText(event, ["imageCredit", "credit", "mediaCredit", "source"], "imageCredit"),
    });
    return { observation, evidence };
  });
}

export function normalizeWorldMonitorFeedDigest(
  responseValue: unknown,
  fetchedAt: string,
): Array<{ observation: Observation; evidence: Evidence }> {
  const response = record(responseValue, "response");
  const generatedAt = newsTime(response.generatedAt, fetchedAt);
  const categories = record(response.categories, "categories");

  return Object.entries(categories).flatMap(([bucketName, bucketValue]) => {
    const bucket = record(bucketValue, `categories.${bucketName}`);
    if (!Array.isArray(bucket.items)) {
      throw new Error(`invalid_worldmonitor:categories.${bucketName}.items`);
    }
    return bucket.items.flatMap((value, index) => {
      try {
        const item = record(value, `categories.${bucketName}.items.${index}`);
        const title = text(item.title, `categories.${bucketName}.items.${index}.title`);
        const source = text(item.source, `categories.${bucketName}.items.${index}.source`);
        const link = text(item.link, `categories.${bucketName}.items.${index}.link`);
        const publishedAt = newsTime(item.publishedAt, generatedAt);
        const threat = item.threat && typeof item.threat === "object" && !Array.isArray(item.threat)
          ? item.threat as JsonRecord
          : {};
        const location = item.location && typeof item.location === "object" && !Array.isArray(item.location)
          ? item.location as JsonRecord
          : {};
        const longitude = newsNumber(location.longitude);
        const latitude = newsNumber(location.latitude);
        const hasLocation =
          longitude !== undefined &&
          latitude !== undefined &&
          longitude >= -180 &&
          longitude <= 180 &&
          latitude >= -90 &&
          latitude <= 90;
        const primaryCategory = newsCategory(bucketName, optionalText(threat.category, "threat.category"));
        const locationName = optionalText(item.locationName, "locationName");
        const snippet = optionalText(item.snippet, "snippet");
        const classification = classifyNews(`${title} ${snippet ?? ""}`, primaryCategory);
        const inferredLocation = hasLocation
          ? null
          : inferNewsLocation(`${title} ${snippet ?? ""} ${locationName ?? ""}`);
        const geometry = hasLocation
          ? { type: "Point" as const, coordinates: [longitude, latitude] as [number, number] }
          : inferredLocation?.geometry ?? null;
        const id = createHash("sha256")
          .update(`${link}\n${title}\n${publishedAt}`)
          .digest("hex")
          .slice(0, 20);
        const observation = parseObservation({
          id: `worldmonitor:news:${id}`,
          provider: "worldmonitor",
          providerSourceId: id,
          sourceFamily: "worldmonitor-news",
          url: link,
          occurredAt: publishedAt,
          fetchedAt,
          title,
          description: snippet ?? [locationName, source].filter(Boolean).join(" · "),
          primaryCategory,
          eventType: classification.eventType,
          relatedCategories:
            primaryCategory === "conflict" ? ["security"] :
            primaryCategory === "supply-chains" ? ["economy"] :
            primaryCategory === "energy" ? ["supply-chains"] : [],
          geometry,
          globalScope: geometry === null,
          affectedCountries: inferredLocation?.affectedCountries ?? [],
          measurements: {
            alert: item.isAlert === true,
            corroborationCount: newsNumber(item.corroborationCount) ?? 1,
            mentionCount: newsNumber((item.storyMeta as JsonRecord | undefined)?.mentionCount) ?? 1,
            sourceCount: newsNumber((item.storyMeta as JsonRecord | undefined)?.sourceCount) ?? 1,
            threatLevel: optionalText(threat.level, "threat.level") ?? "THREAT_LEVEL_UNSPECIFIED",
            threatConfidence: newsNumber(threat.confidence) ?? null,
            locationPrecision: hasLocation
              ? "provider_exact"
              : inferredLocation?.precision ?? "unmapped",
            locationDisplayName: locationName
              ?? inferredLocation?.displayName
              ?? "Not precisely mapped",
          },
          extension: {
            upstreamBucket: bucketName,
            upstreamEndpoint: "/api/news/v1/list-feed-digest",
            upstreamStoryPhase: (item.storyMeta as JsonRecord | undefined)?.phase ?? null,
          },
        });
        const evidence = parseEvidence({
          id: `${observation.id}:evidence`,
          observationId: observation.id,
          sourceId: id,
          sourceFamily: "worldmonitor-news",
          url: link,
          publishedAt,
          fetchedAt,
          title,
          imageUrl: pickFirstText(item, ["imageUrl", "image", "thumbnail"], "image"),
          imageAlt: title,
          imageCredit: source,
        });
        return [{ observation, evidence }];
      } catch {
        return [];
      }
    });
  });
}
