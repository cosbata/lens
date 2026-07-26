# LENS providers

LENS treats providers as attributable observations, not as authorities over
the final ranking.

| Provider | Contract | Poll | Role |
| --- | --- | --- | --- |
| USGS | Significant earthquakes GeoJSON + event detail | 5 min | Direct official seismic observations |
| WorldMonitor | Proto-defined conflict events | 10 min | Breadth adapter; upstream importance is discarded |
| NASA EONET v3 | Open natural events JSON | 15 min | Independent curated natural-event metadata |
| Kystverket / BarentsWatch Historic AIS | OAuth2 + 24-hour vessel track JSON | 15 min, opt-in | Enriches an existing selected event with observed vessel positions |

Each provider records its own run state. A provider failure marks only that
provider degraded, preserves the last valid briefing, and does not stop the
other schedules. Original source URLs remain attached to evidence.

WorldMonitor is called with `WORLDMONITOR_BASE_URL` (default
`https://api.worldmonitor.app`). Set `WORLDMONITOR_API_KEY` when API access
requires a key; the adapter sends `X-WorldMonitor-Key` (and fallback `X-Api-Key`).

NASA documents EONET v3 at <https://eonet.gsfc.nasa.gov/docs/v3>.

## BarentsWatch movement history

Set `BARENTSWATCH_CLIENT_ID`, `BARENTSWATCH_CLIENT_SECRET`,
`BARENTSWATCH_MMSI`, and `BARENTSWATCH_EVENT_ID` on the server. The event must
already exist in the canonical store; AIS observations enrich it but never
create or promote a news event on their own. Credentials remain server-side.

The Norwegian Coastal Administration provides the source data under the
Norwegian Licence for Open Government Data (NLOD), with required attribution.
Open coverage is limited to the Norwegian economic zone and the protected zones
around Svalbard and Jan Mayen; small fishing vessels and small recreational
craft are excluded, and the API exposes no data older than 14 days. LENS labels
the source as `barentswatch:kystverket` and does not imply global coverage.

- Official access and licence:
  <https://www.kystverket.no/en/navigation-and-monitoring/ais/access-to-ais-data/>
- Official API and authentication:
  <https://developer.barentswatch.no/docs/AIS/live-ais-api/>
- Historic track endpoint:
  `GET /v1/historic/trackslast24hours/{mmsi}`
