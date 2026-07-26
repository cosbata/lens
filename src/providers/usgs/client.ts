const FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson";

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
  const feed = record(await json(fetcher, FEED_URL), "feed");
  if (!Array.isArray(feed.features)) throw new Error("invalid_usgs_response:features");
  return Promise.all(feed.features.map(async (feature, index) => {
    const item = record(feature, `features.${index}`);
    const properties = record(item.properties, `features.${index}.properties`);
    if (typeof properties.detail !== "string") {
      throw new Error(`invalid_usgs_response:features.${index}.detail`);
    }
    return { feature, detail: await json(fetcher, properties.detail) };
  }));
}
