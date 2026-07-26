const EONET_URL =
  "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=200";

export async function fetchEonetEvents(fetcher: typeof fetch = fetch) {
  const response = await fetcher(EONET_URL, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`eonet_http_${response.status}`);
  return response.json() as Promise<unknown>;
}
