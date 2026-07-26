import {
  parseEvidence,
  parseObservation,
  type Category,
  type Evidence,
  type Geometry,
  type Observation,
} from "../../core/model";

type JsonRecord = Record<string, unknown>;

const CATEGORY: Record<string, Category> = {
  wildfires: "disasters",
  volcanoes: "disasters",
  severeStorms: "disasters",
  floods: "disasters",
  earthquakes: "disasters",
  landslides: "disasters",
  drought: "climate-environment",
  dustHaze: "climate-environment",
  snow: "climate-environment",
  seaLakeIce: "climate-environment",
};

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid_eonet:${field}`);
  }
  return value as JsonRecord;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`invalid_eonet:${field}`);
  return value;
}

function geometry(value: unknown, field: string): { date: string; geometry: Geometry } {
  const item = record(value, field);
  const date = text(item.date, `${field}.date`);
  if (!Number.isFinite(Date.parse(date))) throw new Error(`invalid_eonet:${field}.date`);
  if (item.type !== "Point" && item.type !== "LineString" && item.type !== "Polygon") {
    throw new Error(`invalid_eonet:${field}.type`);
  }
  return { date, geometry: { type: item.type, coordinates: item.coordinates } as Geometry };
}

export function normalizeEonetEvents(
  responseValue: unknown,
  fetchedAt: string,
): Array<{ observation: Observation; evidence: Evidence }> {
  const response = record(responseValue, "response");
  if (!Array.isArray(response.events)) throw new Error("invalid_eonet:events");
  return response.events.map((value, index) => {
    const event = record(value, `events.${index}`);
    if (!Array.isArray(event.categories) || event.categories.length === 0) {
      throw new Error(`invalid_eonet:events.${index}.categories`);
    }
    const categories = event.categories.map((item, categoryIndex) =>
      record(item, `events.${index}.categories.${categoryIndex}`)
    );
    const categoryIds = categories.map((item, categoryIndex) =>
      text(item.id, `events.${index}.categories.${categoryIndex}.id`)
    );
    const primaryCategory = CATEGORY[categoryIds[0]];
    if (!primaryCategory) throw new Error(`invalid_eonet:events.${index}.categories.0.id`);
    if (!Array.isArray(event.geometry) || event.geometry.length === 0) {
      throw new Error(`invalid_eonet:events.${index}.geometry`);
    }
    const history = event.geometry
      .map((item, geometryIndex) => geometry(item, `events.${index}.geometry.${geometryIndex}`))
      .sort((left, right) => left.date.localeCompare(right.date));
    const latest = history[history.length - 1];
    if (!Array.isArray(event.sources) || event.sources.length === 0) {
      throw new Error(`invalid_eonet:events.${index}.sources`);
    }
    const source = record(event.sources[0], `events.${index}.sources.0`);
    const sourceId = text(source.id, `events.${index}.sources.0.id`);
    const sourceUrl = text(source.url, `events.${index}.sources.0.url`);
    const id = text(event.id, `events.${index}.id`);
    const title = text(event.title, `events.${index}.title`);
    const observation = parseObservation({
      id: `eonet:${id}`,
      provider: "eonet",
      providerSourceId: id,
      sourceFamily: `eonet:${sourceId}`,
      url: sourceUrl,
      occurredAt: latest.date,
      fetchedAt,
      title,
      description: typeof event.description === "string" && event.description.trim()
        ? event.description
        : title,
      primaryCategory,
      relatedCategories: primaryCategory === "disasters" ? ["climate-environment"] : [],
      geometry: latest.geometry,
      geometryHistory: history.map(({ date, geometry }) => ({ observedAt: date, geometry })),
      globalScope: false,
      affectedCountries: [],
      measurements: {
        magnitudeValue: typeof event.magnitudeValue === "number" ? event.magnitudeValue : null,
        magnitudeUnit: typeof event.magnitudeUnit === "string" ? event.magnitudeUnit : null,
      },
      extension: {
        eonetLink: text(event.link, `events.${index}.link`),
        categoryIds: categoryIds.join(","),
        sourceIds: event.sources.map((item, sourceIndex) =>
          text(record(item, `events.${index}.sources.${sourceIndex}`).id, `events.${index}.sources.${sourceIndex}.id`)
        ).join(","),
        closed: event.closed === null || typeof event.closed === "string" ? event.closed : null,
      },
    });
    return {
      observation,
      evidence: parseEvidence({
        id: `${observation.id}:evidence`,
        observationId: observation.id,
        sourceId,
        sourceFamily: observation.sourceFamily,
        url: sourceUrl,
        publishedAt: latest.date,
        fetchedAt,
        title,
      }),
    };
  });
}
