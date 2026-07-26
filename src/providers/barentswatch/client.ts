const TOKEN_URL = "https://id.barentswatch.no/connect/token";
const TRACK_URL = "https://historic.ais.barentswatch.no/v1/historic/trackslast24hours";

export async function fetchBarentsWatchTrack({
  clientId,
  clientSecret,
  mmsi,
  fetcher = fetch,
}: {
  clientId: string;
  clientSecret: string;
  mmsi: number;
  fetcher?: typeof fetch;
}) {
  if (!clientId || !clientSecret || !Number.isInteger(mmsi) || mmsi < 0 || mmsi > 1_073_741_823) {
    throw new Error("invalid_barentswatch_config");
  }
  const tokenResponse = await fetcher(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "ais",
      grant_type: "client_credentials",
    }),
  });
  if (!tokenResponse.ok) throw new Error(`barentswatch_token_http_${tokenResponse.status}`);
  const token = await tokenResponse.json() as { access_token?: unknown };
  if (typeof token.access_token !== "string" || token.access_token === "") {
    throw new Error("invalid_barentswatch_token");
  }
  const trackResponse = await fetcher(`${TRACK_URL}/${mmsi}`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!trackResponse.ok) throw new Error(`barentswatch_track_http_${trackResponse.status}`);
  return trackResponse.json();
}
