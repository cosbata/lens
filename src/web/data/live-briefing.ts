import type { TodayEvent } from "../map/briefing-fixture";

type ApiEvent = {
  event: {
    id: string;
    title: string;
    description: string;
    primaryCategory: string;
    eventType?: string;
    geometry: { type: string; coordinates: unknown } | null;
    geometryHistory?: Array<{
      observedAt: string;
      geometry: { type: string; coordinates: unknown };
    }>;
    affectedCountries?: string[];
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
  data: {
    events: ApiEvent[];
    watchlist?: ApiEvent[];
    monitored?: ApiEvent[];
    activity?: ApiEvent[];
  };
};

export type OperationalLayersResponse = {
  data: {
    alerts: Array<ApiEvent & {
      kind: "reported-alert";
      observedAt: string;
      expiresAt: string;
      precision: string;
      evidenceClass: string;
    }>;
  };
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

const impactByCategory: Record<string, string> = {
  conflict: "Watch for verified changes to civilian safety, access, and regional security.",
  "politics-diplomacy": "Watch for a confirmed policy, legal, or cross-border consequence.",
  security: "Watch for verified effects on public safety and critical services.",
  disasters: "Watch for official impact measurements, service disruption, and response updates.",
  "climate-environment": "Watch for measured changes to exposure, air, water, land, or ecosystems.",
  economy: "Watch for confirmed changes to prices, employment, trade, or financial conditions.",
  energy: "Watch for measured supply, generation, price, or infrastructure changes.",
  "supply-chains": "Watch for confirmed route, port, freight, or production disruption.",
  health: "Watch for official case, capacity, treatment, or public-health guidance.",
  "technology-infrastructure": "Watch for confirmed service scope, restoration, and downstream disruption.",
};

function evidenceSummary(detail: ApiEvent, locationDisplayName: string) {
  const sourceCount = new Set(detail.event.sourceFamilies).size;
  return `Mapped area: ${locationDisplayName}. ${sourceCount} source ${sourceCount === 1 ? "family is" : "families are"} attached to this event.`;
}

function verifiedChange(detail: ApiEvent) {
  const positions = detail.event.geometryHistory?.length ?? 0;
  if (positions > 1) {
    return `The provider supplies ${positions} timestamped geometry observations for comparison.`;
  }
  if (detail.evidence.length > 1) {
    return `${detail.evidence.length} evidence records are available; no earlier geometry revision is attached.`;
  }
  return "No earlier verified revision is available yet.";
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
        eventType: detail.event.eventType ?? "unknown",
        summary: detail.event.description,
        source: detail.event.sourceFamilies.join(" · "),
        updatedAt: detail.event.lastMaterialUpdateAt,
        score: detail.scores[0]?.finalScore ?? existing.score,
        coordinates,
        geometry: detail.event.geometry as TodayEvent["geometry"],
        geometryHistory: history,
        countryCodes: detail.event.affectedCountries ?? [],
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
    const whatChanged = verifiedChange(detail);
    const affected = evidenceSummary(detail, locationDisplayName);
    const whyItMatters = impactByCategory[detail.event.primaryCategory]
      ?? "Watch for a confirmed material effect in subsequent source updates.";
    return {
      id: detail.event.id,
      category: detail.event.primaryCategory.replaceAll("-", " "),
      eventType: detail.event.eventType ?? "unknown",
      chapter: "Live update",
      title: detail.event.title,
      summary: body,
      whyItMatters,
      whatChanged,
      affected,
      source: detail.event.sourceFamilies.join(" · "),
      updatedAt: detail.event.lastMaterialUpdateAt,
      coordinates,
      geometry: detail.event.geometry as TodayEvent["geometry"],
      geometryHistory: history,
      countryCodes: detail.event.affectedCountries ?? [],
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
        ["overview", "What happened", detail.event.title, body],
        ["spread", "What is mapped", locationDisplayName, affected],
        ["change", "What changed", "Available comparison evidence", whatChanged],
        ["impact", "Why it matters", "The next confirmed consequence", whyItMatters],
        ["watch", "What to watch next", "Wait for a material source update",
          "A newer timestamp, changed measurement, or additional independent evidence will update this event."],
      ].map(([id, eyebrow, title, chapterBody]) => ({
        id: id as "overview" | "spread" | "change" | "impact" | "watch",
        eyebrow,
        title,
        body: chapterBody,
        mapNote: `Location precision: ${locationPrecision.replaceAll("_", " ")}.`,
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

export function briefingToMonitoredEvents(briefing: BriefingResponse) {
  return apiEventsToTodayEvents(briefing.data.monitored ?? [], []);
}

export function operationalLayersToAlertEvents(layers: OperationalLayersResponse) {
  const alerts = new Map(layers.data.alerts.map((alert) => [alert.event.id, alert]));
  return apiEventsToTodayEvents(layers.data.alerts, []).map((event) => ({
    ...event,
    chapter: "Reported alert",
    selectionReason: `${
      alerts.get(event.id)?.evidenceClass === "official-or-provider"
        ? "Official or provider report"
        : "Media report"
    } · Location precision: ${
      event.locationPrecision?.replaceAll("_", " ") ?? "unknown"
    }.`,
  }));
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
