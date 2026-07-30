# LENS live-data integration status

Updated: 2026-07-29

## Working now without a paid account

| Source | What LENS receives | Status | Cost |
| --- | --- | --- | --- |
| Curated RSS/Atom | Global reporting across ten categories, article images and source links | Live | Free |
| USGS | Earthquakes, coordinates, magnitude, revision time | Live | Free |
| NASA EONET | Wildfires, storms, volcanoes and other natural events | Live | Free |
| PizzINT | Aggregate activity around selected Washington-area institutions | Live, ten-minute server cache | Free public proxy |
| GDELT via PizzINT | Six bilateral media-tension series | Live, trailing seven days | Free public signal |
| Esri public imagery | Satellite-style basemap | Live | No current LENS API key |
| Local SQLite | Observations, evidence, scores and 24-hour snapshots | Live | Free |

These sources keep the map populated even when WorldMonitor is not configured.
RSS stories remain behind the editorial selection threshold by default. The
map starts in `All monitored` mode and reveals every active mapped event. Up to
24 diverse, high-scoring events form the main-issue watchlist, while `Live
observations` isolates USGS and EONET records so structured hazards are not
discarded just because they are not a lead story.

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
WorldMonitor observations pass through the same shared geography and
cross-provider reconciliation used by the direct providers.

## Operations

- `npm run live-feed-smoke -- --all` checks all configured public feeds and
  reports failed feed IDs and error classes.
- `npm run reindex -- --dry-run` previews stored RSS location changes.
- `npm run reindex` applies them idempotently and rebuilds the briefing.
- `/api/v1/providers/health` reports the latest provider and per-feed state.
- `/api/v1/metrics` reports raw evidence, active canonical events, deduplication,
  map precision, exact-coordinate collisions, editorial selections, and
  observed activity.
- `/api/v1/operational-signals` reports the optional PizzINT aggregate and
  GDELT bilateral signals. They are labeled as proxies, not official alerts.

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

## WorldMonitor gap after the operational-signal release

| WorldMonitor capability | LENS now | What is needed next |
| --- | --- | --- |
| PizzINT and GDELT tension | Aggregate activity and six country pairs are connected | Keep the proxy disclaimer and monitor upstream stability |
| Military aircraft | Not connected | OpenSky/Wingbits credentials, military classification review, coarse display or delay policy |
| Global ships and naval activity | One optional BarentsWatch event history only | AISStream or licensed AIS source, rate/retention policy, chokepoint aggregation |
| Missile/rocket activity | No global missile telemetry | Connect civil-warning and attributed strike-report feeds as alerts/areas; never draw an unsupported flight path |
| Conflict event databases | RSS plus two optional WorldMonitor endpoints | Direct ACLED/UCDP licensing or WorldMonitor API access |
| GPS jamming and interference | Not connected | A maintained public interference feed and confidence model |
| Military bases, nuclear sites, ports, cables and pipelines | Not connected | Curated static datasets and separate context-layer toggles |
| Satellite/orbital activity | Not connected | CelesTrak or equivalent orbital elements and a distinct space layer |
| Aviation delays and NOTAMs | Not connected | Aviation provider, airport identifiers, and route-impact normalization |
| Cyber, internet outages and service disruption | News-derived only | Structured outage providers and geographic/service impact normalization |
| Country risk, sanctions, markets and energy flows | News-derived only | Structured indicators with slower refresh and separate scoring |

Aircraft and vessel locations are observations only when a transmitter and
receiver expose them. Silence is not proof of absence. Missile paths are not a
general public live-data product; LENS should show attributed launch/impact or
civil-warning reports with time and area precision instead of inventing a
trajectory.
