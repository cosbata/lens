# LENS live-data integration status

Updated: 2026-07-26

## Working now without a paid account

| Source | What LENS receives | Status | Cost |
| --- | --- | --- | --- |
| USGS | Earthquakes, coordinates, magnitude, revision time | Live | Free |
| NASA EONET | Wildfires, storms, volcanoes and other natural events | Live | Free |
| Esri public imagery | Satellite-style basemap | Live | No current LENS API key |
| Local SQLite | Observations, evidence, scores and 24-hour snapshots | Live | Free |

These sources keep the map populated even when WorldMonitor is not configured.

## WorldMonitor integration prepared in LENS

The server now accepts a `wm_...` key through `WORLDMONITOR_API_KEY` and sends
it only in the server-side `X-WorldMonitor-Key` header.

| Endpoint | Purpose | LENS handling |
| --- | --- | --- |
| `/api/news/v1/list-feed-digest?variant=full&lang=en` | Aggregated and deduplicated global news | Normalizes title, source, time, location, alert, threat and corroboration into the ten LENS categories |
| `/api/conflict/v1/list-iran-events` | Structured conflict observations | Normalizes coordinates, source attribution and severity |

WorldMonitor's `importanceScore` is not copied into the LENS ranking. LENS uses
the upstream alert/threat and distinct-source corroboration as inputs, then
calculates its own explainable score. A failure in one WorldMonitor endpoint
does not discard data returned by the other.

## What still requires the account owner

1. Buy **API Starter** or **API Business** at
   [worldmonitor.app/pro](https://worldmonitor.app/pro). Dashboard Pro alone
   does not issue a manual REST API key.
2. Sign in, open **Settings → API Keys**, create a key, and copy the complete
   value once.
3. Put it in the ignored local file `/Users/bata/bata/lens/.env`:

   ```dotenv
   WORLDMONITOR_API_KEY=wm_<40 lowercase hex characters>
   ```

4. Restart the API server. The provider health endpoint should change from
   `worldmonitor_api_key_missing` to `success` or a specific upstream error.

Do not paste the key into chat, commit it, or expose it as a `VITE_` variable.

## Current official WorldMonitor prices

| Plan | Price | Relevant boundary |
| --- | ---: | --- |
| Free | $0 | Public dashboard; no reusable server API key |
| Pro | $39.99/month or $399.99/year | Dashboard, AI/MCP features; no manual REST API key |
| API Starter | $99.99/month or $999.99/year | 60 requests/minute, 1,000/day, personal/non-commercial use |
| API Business | $299.99/month | 300 requests/minute, 10,000/day, commercial use, five Pro licenses |
| Enterprise | Custom | Unlimited API, SLA, SSO/RBAC and deployment options |

Prices can change. Confirm them in the official
[pricing documentation](https://www.worldmonitor.app/docs/pricing) before purchase.

## Deliberately not connected yet

- **Article photos:** the main WorldMonitor news-digest schema does not expose
  an image URL. LENS displays an upstream image only when a provider supplies
  one and otherwise omits the media area. A separate, rate-limited article
  metadata/RSS image connector should be added only after the live digest is
  available, so it fetches images for selected stories rather than scraping
  every article.
- **Global vessel tracks:** the optional BarentsWatch adapter is already present
  but is limited to its published Norwegian coverage and needs client
  credentials. WorldMonitor shipping/AIS endpoints are the better next step
  after the primary news feed is verified.
- **Every WorldMonitor layer:** `/api/bootstrap` can hydrate many domains, but
  importing all of them would recreate the complexity LENS is designed to
  remove. Add country risk, shipping, infrastructure and economic signals only
  when they support a selected public story.
