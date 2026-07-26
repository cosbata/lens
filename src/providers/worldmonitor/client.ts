function worldMonitorHeaders(): Record<string, string> {
  const apiKey = process.env.WORLDMONITOR_API_KEY?.trim();
  if (apiKey && !/^wm_[a-f0-9]{40}$/.test(apiKey)) {
    throw new Error("worldmonitor_api_key_invalid");
  }
  return {
    accept: "application/json",
    ...(apiKey ? { "X-WorldMonitor-Key": apiKey } : {}),
  };
}

async function fetchWorldMonitorJson(
  path: string,
  fetcher: typeof fetch,
  baseUrl: string,
) {
  const response = await fetcher(new URL(path, baseUrl), {
    headers: worldMonitorHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`worldmonitor_http_${response.status}`);
  return response.json() as Promise<unknown>;
}

export async function fetchWorldMonitorIranEvents(
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.WORLDMONITOR_BASE_URL ?? "https://api.worldmonitor.app",
) {
  return fetchWorldMonitorJson("/api/conflict/v1/list-iran-events", fetcher, baseUrl);
}

export async function fetchWorldMonitorFeedDigest(
  fetcher: typeof fetch = fetch,
  baseUrl = process.env.WORLDMONITOR_BASE_URL ?? "https://api.worldmonitor.app",
) {
  return fetchWorldMonitorJson("/api/news/v1/list-feed-digest?variant=full&lang=en", fetcher, baseUrl);
}
