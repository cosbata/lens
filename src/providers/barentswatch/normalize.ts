import { parseEvidence, parseObservation } from "../../core/model";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid_barentswatch:${field}`);
  }
  return value as JsonRecord;
}

export function normalizeBarentsWatchTrack(value: unknown, fetchedAt: string, mmsi: number) {
  if (!Array.isArray(value)) throw new Error("invalid_barentswatch:track");
  const positions = value.map((entry, index) => {
    const item = record(entry, `track.${index}`);
    if (
      item.mmsi !== mmsi ||
      typeof item.longitude !== "number" ||
      typeof item.latitude !== "number" ||
      typeof item.msgtime !== "string" ||
      !Number.isFinite(Date.parse(item.msgtime))
    ) throw new Error(`invalid_barentswatch:track.${index}`);
    return {
      observedAt: item.msgtime,
      geometry: {
        type: "Point" as const,
        coordinates: [item.longitude, item.latitude] as [number, number],
      },
      name: typeof item.name === "string" && item.name.trim() ? item.name.trim() : null,
      speed: typeof item.speedOverGround === "number" ? item.speedOverGround : null,
      stream: typeof item.stream === "string" ? item.stream : null,
    };
  }).sort((left, right) => left.observedAt.localeCompare(right.observedAt));
  const unique = positions.filter(
    (item, index) => index === 0 || item.observedAt !== positions[index - 1].observedAt,
  );
  if (unique.length === 0) throw new Error("invalid_barentswatch:empty_track");
  const latest = unique[unique.length - 1];
  const sourceUrl =
    `https://historic.ais.barentswatch.no/v1/historic/trackslast24hours/${mmsi}`;
  const title = `${latest.name ?? `Vessel ${mmsi}`} · 24-hour AIS track`;
  const observation = parseObservation({
    id: `barentswatch:${mmsi}`,
    provider: "barentswatch",
    providerSourceId: String(mmsi),
    sourceFamily: "barentswatch:kystverket",
    url: sourceUrl,
    occurredAt: latest.observedAt,
    fetchedAt,
    title,
    description: "Observed vessel positions from the Norwegian Coastal Administration.",
    primaryCategory: "supply-chains",
    eventType: "shipping",
    relatedCategories: ["economy", "energy"],
    geometry: latest.geometry,
    geometryHistory: unique.map(({ observedAt, geometry }) => ({ observedAt, geometry })),
    globalScope: false,
    affectedCountries: ["NO"],
    measurements: {
      mmsi,
      speedOverGround: latest.speed,
      stream: latest.stream,
      positionCount: unique.length,
    },
    extension: {
      coverage: "Norwegian economic zone and protected zones",
      license: "NLOD",
    },
  });
  return {
    observation,
    evidence: parseEvidence({
      id: `${observation.id}:evidence`,
      observationId: observation.id,
      sourceId: String(mmsi),
      sourceFamily: observation.sourceFamily,
      url: sourceUrl,
      publishedAt: latest.observedAt,
      fetchedAt,
      title,
    }),
  };
}
