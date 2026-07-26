import { createHash } from "node:crypto";
import { RSS_FEEDS, type RssFeed } from "../../config/rss-feeds";
import {
  parseEventCluster,
  parseEventScore,
  parseEvidence,
  parseObservation,
} from "../../core/model";
import { calculateNewsImportance } from "../../core/score/news-importance";
import { fetchArticleImage } from "../../providers/rss/article-image";
import {
  collectRssFeeds,
  type FeedFetchResult,
} from "../../providers/rss/client";
import { classifyNews } from "../../upstream/worldmonitor/classifier";
import {
  inferNewsLocation,
  type NewsLocation,
} from "../../upstream/worldmonitor/geography";
import {
  adoptExistingCanonical,
  assignStoryIdentity,
} from "../../upstream/worldmonitor/dedup.mjs";
import { normalizeStoryText, stripAttributionSuffix } from "../../upstream/worldmonitor/story-identity.js";
import { publishBriefingUpdate } from "../api/stream";
import type { LensStore } from "../store";
import { rebuildBriefing } from "./ingest-usgs";

const STORY_ALIAS_TTL_MS = 96 * 60 * 60_000;
const IMAGE_CACHE_MS = 24 * 60 * 60_000;
const MAX_ARTICLE_IMAGE_FETCHES = 10;
const STORY_TOPIC_WINDOW_MS = 96 * 60 * 60_000;
const ACTIVE_STORY_WINDOW_MS = 7 * 24 * 60 * 60_000;
const DISEASE_TOPICS = [
  "ebola", "marburg", "mpox", "cholera", "dengue", "measles",
  "polio", "hantavirus", "covid",
] as const;
const sha256 = async (value: string) =>
  createHash("sha256").update(value).digest("hex");
const normalizeTitle = (value: string) =>
  normalizeStoryText(stripAttributionSuffix(value));
const shortHash = (value: string) =>
  createHash("sha256").update(value).digest("hex").slice(0, 20);

type Loader = (
  feeds: RssFeed[],
  options: Parameters<typeof collectRssFeeds>[1],
) => Promise<FeedFetchResult[]>;
type ImageLoader = (url: string) => Promise<string | undefined>;

const evidenceId = (observationId: string, source: string, link: string) =>
  `${observationId}:evidence:${shortHash(`${source}\n${link}`)}`;
const eventId = (observationId: string) => `event:${observationId}`;
const round = (value: number) => Math.round(value * 10) / 10;
const diseaseTopic = (text: string) => {
  const normalized = text.toLowerCase();
  return DISEASE_TOPICS.find((topic) => normalized.includes(topic));
};
const isRoundup = (title: string) => /^(?:world|global) news in brief\b/i.test(title);
const unmappedLocation = (): NewsLocation => ({
  geometry: null,
  affectedCountries: [],
  precision: "unmapped",
  matchedTerms: [],
  referenceVersion: "lens-roundup-v1",
});

export async function ingestRss({
  store,
  now,
  feeds = RSS_FEEDS,
  load = collectRssFeeds,
  loadImage = fetchArticleImage,
}: {
  store: LensStore;
  now: () => Date;
  feeds?: RssFeed[];
  load?: Loader;
  loadImage?: ImageLoader;
}) {
  const checkedAt = now();
  const startedAt = checkedAt.toISOString();
  const results = await load(feeds, {
    now: checkedAt,
    stateForFeed: (id) => store.feedState(id),
  });

  for (const result of results) {
    const previous = store.feedState(result.feed.id);
    const successful = result.status !== "failed";
    store.saveFeedState({
      feedId: result.feed.id,
      etag: result.etag,
      lastModified: result.lastModified,
      lastCheckedAt: startedAt,
      lastSuccessAt: successful ? startedAt : previous?.lastSuccessAt,
      failureCount: successful ? 0 : (previous?.failureCount ?? 0) + 1,
      itemCount: result.items.length,
      errorClass: result.errorClass,
    });
  }

  const items = results.flatMap(({ items }) => items);
  const identityItems = items.map((item) => ({
    title: item.title,
    source: item.source,
    publishedAt: Date.parse(item.publishedAt),
    item,
  }));
  const identities = await assignStoryIdentity(identityItems, normalizeTitle, sha256);
  const memberHashes = [...new Set(
    [...identities.values()].flatMap(({ memberTitleHashes }) => memberTitleHashes),
  )];
  const previousAliases = store.storyAliasTargets(memberHashes, startedAt);
  const groups = new Map<string, typeof items>();

  const identityByItem = new Map<typeof items[number], Awaited<
    ReturnType<typeof assignStoryIdentity>
  > extends Map<unknown, infer Identity> ? Identity : never>();
  for (const identityItem of identityItems) {
    const item = identityItem.item;
    const identity = identities.get(identityItem);
    if (!identity) continue;
    identityByItem.set(item, identity);
    const canonicalHash = adoptExistingCanonical(
      identity.memberTitleHashes,
      identity.titleHash,
      previousAliases,
    );
    const group = groups.get(canonicalHash);
    if (group) group.push(item);
    else groups.set(canonicalHash, [item]);
    store.saveStoryAliases(
      canonicalHash,
      identity.memberTitleHashes,
      new Date(checkedAt.getTime() + STORY_ALIAS_TTL_MS).toISOString(),
    );
  }

  const lexicalGroups = [...groups].map(([canonicalHash, stories]) => {
    const sources = [...new Set(stories.map(({ source }) => source))];
    const ranked = stories.map((story) => {
      const classification = classifyNews(
        `${story.title} ${story.description}`,
        story.categoryHint,
      );
      return {
        story,
        classification,
        importance: calculateNewsImportance({
          level: classification.level,
          source: story.source,
          authority: story.authority,
          corroborationCount: sources.length,
          publishedAt: story.publishedAt,
          now: startedAt,
          title: story.title,
        }),
      };
    }).sort((left, right) =>
      right.importance.finalScore - left.importance.finalScore
      || right.story.publishedAt.localeCompare(left.story.publishedAt)
      || left.story.title.localeCompare(right.story.title));
    const representative = ranked[0];
    const locationText = stories.map(({ title, description }) => `${title} ${description}`).join(" ");
    const location = isRoundup(representative.story.title)
      ? unmappedLocation()
      : inferNewsLocation(locationText);
    return {
      canonicalHash,
      canonicalHashes: [canonicalHash],
      stories: [...stories],
      sources,
      representative,
      location,
      topic: diseaseTopic(stories.map(({ title, description }) => `${title} ${description}`).join(" ")),
    };
  }).sort((left, right) =>
    right.representative.importance.finalScore - left.representative.importance.finalScore
    || right.representative.story.publishedAt.localeCompare(left.representative.story.publishedAt));

  const prepared: typeof lexicalGroups = [];
  for (const item of lexicalGroups) {
    const occurredAt = Date.parse(item.representative.story.publishedAt);
    const existing = item.topic && item.location.affectedCountries.length > 0
      ? prepared.find((candidate) =>
        candidate.topic === item.topic
        && candidate.location.affectedCountries.some((country) =>
          item.location.affectedCountries.includes(country))
        && Math.abs(Date.parse(candidate.representative.story.publishedAt) - occurredAt)
          <= STORY_TOPIC_WINDOW_MS)
      : undefined;
    if (!existing) {
      prepared.push(item);
      continue;
    }
    existing.canonicalHashes.push(...item.canonicalHashes);
    existing.stories.push(...item.stories);
    existing.sources = [...new Set([...existing.sources, ...item.sources])];
    existing.representative.importance = calculateNewsImportance({
      level: existing.representative.classification.level,
      source: existing.representative.story.source,
      authority: existing.representative.story.authority,
      corroborationCount: existing.sources.length,
      publishedAt: existing.representative.story.publishedAt,
      now: startedAt,
      title: existing.representative.story.title,
    });
    if (
      existing.location.precision === "country_approximate"
      && item.location.precision === "named_hub"
    ) existing.location = item.location;
    const memberHashes = existing.stories.flatMap((story) =>
      identityByItem.get(story)?.memberTitleHashes ?? []);
    store.saveStoryAliases(
      existing.canonicalHash,
      memberHashes,
      new Date(checkedAt.getTime() + STORY_ALIAS_TTL_MS).toISOString(),
    );
  }

  const fallbackImages = new Map<string, string>();
  for (const item of prepared
    .filter(({ representative }) => !representative.story.imageUrl)
    .slice(0, MAX_ARTICLE_IMAGE_FETCHES)) {
    const story = item.representative.story;
    const observationId = `rss:${item.canonicalHash}`;
    const previous = store.evidence(evidenceId(observationId, story.source, story.link));
    if (previous && Date.parse(startedAt) - Date.parse(previous.fetchedAt) < IMAGE_CACHE_MS) {
      if (previous.imageUrl) fallbackImages.set(story.link, previous.imageUrl);
      continue;
    }
    try {
      const image = await loadImage(story.link);
      if (image) fallbackImages.set(story.link, image);
    } catch {
      // A missing article image never blocks the news refresh.
    }
  }

  let materialUpdates = 0;
  for (const {
    canonicalHash,
    canonicalHashes,
    stories,
    sources,
    representative: rankedRepresentative,
    location,
  } of prepared) {
    const representative = rankedRepresentative.story;
    const classification = rankedRepresentative.classification;
    const importance = rankedRepresentative.importance;
    const observationId = `rss:${canonicalHash}`;
    const previousObservation = store.observation(observationId);
    const observation = parseObservation({
      id: observationId,
      provider: "rss",
      providerSourceId: canonicalHash,
      sourceFamily: "rss-news",
      url: representative.link,
      occurredAt: representative.publishedAt,
      fetchedAt: startedAt,
      title: representative.title,
      description: representative.description || `${representative.source} report`,
      primaryCategory: classification.primaryCategory,
      relatedCategories: classification.relatedCategories,
      geometry: location.geometry,
      globalScope: false,
      affectedCountries: location.affectedCountries,
      measurements: {
        corroborationCount: sources.length,
        articleCount: stories.length,
        threatLevel: classification.level,
        classificationConfidence: classification.confidence,
        importanceScore: importance.finalScore,
        importanceSeverity: importance.components.severity,
        importanceSourceTrust: importance.components.sourceTrust,
        importanceCorroboration: importance.components.corroboration,
        importanceRecency: round(importance.components.recency),
        locationPrecision: location.precision,
        locationDisplayName: location.displayName ?? "Not precisely mapped",
      },
      extension: {
        language: representative.language,
        classificationSource: classification.source,
        matchedCategoryKeywords: classification.matchedKeywords.join(","),
        locationPrecision: location.precision,
        locationDisplayName: location.displayName ?? "",
        locationMatchedTerms: location.matchedTerms.join(","),
        locationReferenceVersion: location.referenceVersion,
        memberTitleHashes: identityByItem.get(representative)?.memberTitleHashes.join(",") ?? "",
        scoreVersion: importance.version,
        representativeSource: representative.source,
      },
    });
    const material = !previousObservation
      || previousObservation.title !== observation.title
      || JSON.stringify(previousObservation.measurements) !== JSON.stringify(observation.measurements);
    store.saveObservation(observation);
    const evidenceIds: string[] = [];
    for (const story of stories) {
      const id = evidenceId(observationId, story.source, story.link);
      evidenceIds.push(id);
      const imageUrl = story.imageUrl ?? fallbackImages.get(story.link);
      store.saveEvidence(parseEvidence({
        id,
        observationId,
        sourceId: story.sourceId,
        sourceFamily: story.source,
        url: story.link,
        publishedAt: story.publishedAt,
        fetchedAt: startedAt,
        title: story.title,
        ...(imageUrl ? {
          imageUrl,
          imageAlt: story.title,
          imageCredit: story.imageCredit ?? story.source,
        } : {}),
      }));
    }
    const id = eventId(observationId);
    const previousEvent = store.event(id);
    const phase = checkedAt.getTime() - Date.parse(observation.occurredAt) <= ACTIVE_STORY_WINDOW_MS
      ? "active"
      : "resolved";
    const event = parseEventCluster({
      id,
      title: observation.title,
      description: observation.description,
      primaryCategory: observation.primaryCategory,
      relatedCategories: observation.relatedCategories,
      geometry: observation.geometry,
      globalScope: observation.globalScope,
      affectedCountries: observation.affectedCountries,
      firstSeenAt: previousEvent?.firstSeenAt ?? startedAt,
      lastSeenAt: startedAt,
      lastMaterialUpdateAt: observation.occurredAt,
      phase,
      measurements: observation.measurements,
      evidenceIds,
      sourceFamilies: sources,
    });
    store.saveEvent(event);
    for (const absorbedHash of canonicalHashes.slice(1)) {
      const absorbed = store.event(eventId(`rss:${absorbedHash}`));
      if (absorbed?.phase === "active") {
        store.saveEvent({ ...absorbed, phase: "resolved", lastSeenAt: startedAt });
        materialUpdates += 1;
      }
    }
    if (material || previousEvent?.phase !== phase) {
      const { severity, sourceTrust, corroboration, recency } = importance.components;
      const bonuses = importance.bonuses.diplomacy + importance.bonuses.entityCorroboration;
      store.appendEventScore(parseEventScore({
        eventId: id,
        version: importance.version,
        domainImpact: severity,
        urgency: round(recency),
        momentum: corroboration,
        reach: location.precision === "provider_exact" || location.precision === "named_hub"
          ? 60 : location.precision === "country_approximate" ? 40 : 15,
        anomaly: sourceTrust,
        cascade: Math.min(100, bonuses),
        confidence: round(sourceTrust * .57 + corroboration * .43),
        freshness: round(recency),
        finalScore: importance.finalScore,
        floors: [],
        reasons: importance.reasons,
        calculatedAt: startedAt,
      }));
      materialUpdates += 1;
    }
  }

  for (const event of store.events()) {
    if (!event.id.startsWith("event:rss:") || event.phase !== "active") continue;
    const occurredAt = event.evidenceIds.flatMap((id) => {
      const evidence = store.evidence(id);
      const observation = evidence ? store.observation(evidence.observationId) : null;
      return observation ? [Date.parse(observation.occurredAt)] : [];
    });
    const latest = Math.max(...occurredAt);
    if (!Number.isFinite(latest) || checkedAt.getTime() - latest <= ACTIVE_STORY_WINDOW_MS) continue;
    store.saveEvent({ ...event, phase: "resolved", lastSeenAt: startedAt });
    materialUpdates += 1;
  }

  const healthy = results.filter(({ status }) => status !== "failed").length;
  store.saveProviderRun({
    id: `rss:${startedAt}`,
    provider: "rss",
    startedAt,
    completedAt: now().toISOString(),
    state: healthy === results.length ? "success" : healthy > 0 ? "degraded" : "failed",
    itemCount: items.length,
    stale: healthy < results.length,
    errorClass: healthy < results.length ? `rss_feeds_failed.${results.length - healthy}` : undefined,
  });
  const snapshot = materialUpdates > 0 ? rebuildBriefing(store, startedAt) : null;
  if (snapshot?.created) publishBriefingUpdate(snapshot.snapshot.id);
  return { feeds: results.length, healthy, items: items.length, stories: prepared.length };
}
