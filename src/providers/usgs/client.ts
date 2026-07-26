const FEED_URLS = [
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson",
] as const;

type Fetcher = typeof fetch;
type RecordValue = Record<string, unknown>;

function record(value: unknown, field: string): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`invalid_usgs_response:${field}`);
  }
  return value as RecordValue;
}

async function json(fetcher: Fetcher, url: string) {
  const response = await fetcher(url, { headers: { accept: "application/geo+json, application/json" } });
  if (!response.ok) throw new Error(`usgs_http_${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function fetchUsgsEvents(fetcher: Fetcher = fetch) {
  const feeds = await Promise.all(FEED_URLS.map((url) => json(fetcher, url)));
  const features = feeds.flatMap((value, feedIndex) => {
    const feed = record(value, `feeds.${feedIndex}`);
    if (!Array.isArray(feed.features)) throw new Error(`invalid_usgs_response:feeds.${feedIndex}.features`);
    return feed.features;
  });
  const seen = new Set<string>();
  const unique = features.filter((feature, index) => {
    const item = record(feature, `features.${index}`);
    const properties = record(item.properties, `features.${index}.properties`);
    const id = typeof item.id === "string"
      ? item.id
      : typeof properties.code === "string" ? properties.code : "";
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return Promise.all(unique.map(async (feature, index) => {
    const item = record(feature, `features.${index}`);
    const properties = record(item.properties, `features.${index}.properties`);
    if (typeof properties.detail !== "string") {
      throw new Error(`invalid_usgs_response:features.${index}.detail`);
    }
    return { feature, detail: await json(fetcher, properties.detail) };
  }));
}
