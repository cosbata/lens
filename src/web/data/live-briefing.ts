import type { TodayEvent } from "../map/briefing-fixture";

type ApiEvent = {
  event: {
    id: string;
    title: string;
    description: string;
    primaryCategory: string;
    geometry: { type: string; coordinates: unknown } | null;
    geometryHistory?: Array<{
      observedAt: string;
      geometry: { type: string; coordinates: unknown };
    }>;
    lastMaterialUpdateAt: string;
    sourceFamilies: string[];
    measurements?: Record<string, string | number | boolean | null>;
  };
  scores: Array<{ finalScore: number; version?: string; reasons?: string[] }>;
  evidence: Array<{
    publishedAt: string;
    sourceFamily: string;
    title: string;
    url: string;
    imageUrl?: string;
    imageAlt?: string;
    imageCredit?: string;
  }>;
};

export type BriefingResponse = {
  meta: { state: "empty" | "fresh" | "stale" | "degraded"; dataTime: string | null };
  data: { events: ApiEvent[]; watchlist?: ApiEvent[]; activity?: ApiEvent[] };
};

type LiveEventSource = {
  addEventListener: (name: string, listener: () => void) => void;
  close: () => void;
  onopen: (() => void) | null;
  onerror: (() => void) | null;
};

function point(event: ApiEvent["event"], fallback: [number, number]): [number, number] {
  const coordinates = event.geometry?.coordinates;
  return event.geometry?.type === "Point" &&
    Array.isArray(coordinates) &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
    ? [coordinates[0], coordinates[1]]
    : fallback;
}

function geometryHistory(event: ApiEvent["event"]) {
  return event.geometryHistory?.flatMap((entry) => {
    const geometry = entry.geometry;
    if (
      !["Point", "LineString", "Polygon"].includes(geometry.type) ||
      !Array.isArray(geometry.coordinates) ||
      !Number.isFinite(Date.parse(entry.observedAt))
    ) return [];
    return [{
      observedAt: entry.observedAt,
      geometry: geometry as NonNullable<TodayEvent["geometry"]>,
    }];
  });
}

function media(detail: ApiEvent): TodayEvent["media"] {
  const item = detail.evidence.find(({ imageUrl }) => imageUrl?.startsWith("https://"));
  if (item?.imageUrl) {
    return {
      src: item.imageUrl,
      alt: item.imageAlt || `Source image for ${detail.event.title}`,
      credit: item.imageCredit || item.sourceFamily,
      href: item.url,
      kind: "source",
    };
  }
  return undefined;
}

function reasonLabel(value: string) {
  const [kind, detail] = value.split(".");
  const labels: Record<string, string> = {
    severity: "Event severity",
    source_tier: "Source authority",
    distinct_sources: "Independent corroboration",
    recency: "Recent material update",
    diplomacy_flashpoint: "Diplomatic flashpoint",
    entity_corroboration: "Related-source corroboration",
    public_score: "Public score cap",
  };
  return `${labels[kind] ?? kind.replaceAll("_", " ")}${detail ? `: ${detail.replaceAll("_", " ")}` : ""}`;
}

function apiEventsToTodayEvents(
  details: readonly ApiEvent[],
  fallback: readonly TodayEvent[],
): readonly TodayEvent[] {
  if (details.length === 0) return fallback;
  return details.map((detail, index) => {
    const existing = fallback.find(({ id }) => id === detail.event.id);
    const coordinates = point(detail.event, existing?.coordinates ?? [index * 15, 10]);
    const history = geometryHistory(detail.event);
    if (existing) {
      return {
        ...existing,
        title: detail.event.title,
        summary: detail.event.description,
        source: detail.event.sourceFamilies.join(" · "),
        updatedAt: detail.event.lastMaterialUpdateAt,
        score: detail.scores[0]?.finalScore ?? existing.score,
        coordinates,
        geometry: detail.event.geometry as TodayEvent["geometry"],
        geometryHistory: history,
        timelineSource: "live",
        media: media(detail),
      };
    }
    const body = detail.event.description;
    const score = detail.scores[0];
    const scoreReasons = score?.reasons ?? [];
    const sourceCount = detail.event.sourceFamilies.length;
    const locationPrecision = String(detail.event.measurements?.locationPrecision ?? "provider_exact");
    const locationDisplayName = String(detail.event.measurements?.locationDisplayName ?? "Source-provided location");
    return {
      id: detail.event.id,
      category: detail.event.primaryCategory.replaceAll("-", " "),
      chapter: "Live update",
      title: detail.event.title,
      summary: body,
      whyItMatters: "This event passed the current confidence, importance, and diversity gates.",
      whatChanged: "A source revision materially changed the current assessment.",
      affected: "Affected people, services, and connected systems shown by the available evidence.",
      source: detail.event.sourceFamilies.join(" · "),
      updatedAt: detail.event.lastMaterialUpdateAt,
      coordinates,
      geometry: detail.event.geometry as TodayEvent["geometry"],
      geometryHistory: history,
      timelineSource: "live",
      media: media(detail),
      score: score?.finalScore ?? 0,
      scoreVersion: score?.version,
      scoreReasons,
      sourceCount,
      locationPrecision,
      locationDisplayName,
      selectionReason: scoreReasons.length
        ? scoreReasons.slice(0, 3).map(reasonLabel).join(" · ")
        : "Selected by the reproducible LENS ranking.",
      evidence: detail.evidence.map((item) => ({
        time: item.publishedAt,
        kind: item.sourceFamily === "usgs" || item.sourceFamily === "official"
          ? "official" as const
          : "reporting" as const,
        source: item.sourceFamily,
        fact: item.title,
        url: item.url,
      })),
      storyChapters: [
        ["overview", "What happened", "A material event entered today’s briefing."],
        ["spread", "Where it is spreading", "The mapped location anchors the confirmed impact."],
        ["change", "What changed", "The latest source revision changed the assessment."],
        ["impact", "Why it matters", "Its score passed the public briefing threshold."],
        ["watch", "What to watch next", "New official evidence will update this story in place."],
      ].map(([id, eyebrow, title]) => ({
        id: id as "overview" | "spread" | "change" | "impact" | "watch",
        eyebrow,
        title,
        body,
        mapNote: "Latest attributable source location.",
        coordinates,
        zoom: 4.8,
      })),
    };
  });
}

export function briefingToTodayEvents(
  briefing: BriefingResponse,
  fallback: readonly TodayEvent[],
) {
  return apiEventsToTodayEvents(
    briefing.data.watchlist?.length ? briefing.data.watchlist : briefing.data.events,
    fallback,
  );
}

export function briefingToPrimaryEvent(
  briefing: BriefingResponse,
  fallback: TodayEvent,
) {
  return apiEventsToTodayEvents(briefing.data.events, [fallback])[0];
}

export function briefingToActivityEvents(briefing: BriefingResponse) {
  return apiEventsToTodayEvents(briefing.data.activity ?? [], []);
}

export function watchBriefing({
  onBriefing,
  onState,
  fetcher = fetch,
  eventSource = (url) => new EventSource(url) as unknown as LiveEventSource,
  pollMs = 30_000,
}: {
  onBriefing: (briefing: BriefingResponse) => void;
  onState?: (state: "live" | "polling" | "offline") => void;
  fetcher?: typeof fetch;
  eventSource?: (url: string) => LiveEventSource;
  pollMs?: number;
}) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const refresh = async () => {
    try {
      const response = await fetcher("/api/v1/briefing");
      if (!response.ok) throw new Error(`briefing_http_${response.status}`);
      if (!stopped) onBriefing(await response.json() as BriefingResponse);
    } catch {
      if (!stopped) onState?.("offline");
    }
  };
  const schedule = () => {
    onState?.("polling");
    const poll = async () => {
      await refresh();
      if (!stopped) timer = setTimeout(poll, pollMs);
    };
    void poll();
  };
  void refresh();
  const stream = eventSource("/api/v1/stream");
  stream.onopen = () => onState?.("live");
  stream.addEventListener("briefing", () => { void refresh(); });
  stream.onerror = () => {
    stream.close();
    if (!timer) schedule();
  };
  return () => {
    stopped = true;
    stream.close();
    if (timer) clearTimeout(timer);
  };
}
