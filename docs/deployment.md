# One-service Railway deployment

LENS runs as one persistent service: Fastify serves the built React app,
read/SSE APIs, provider schedules, and one SQLite database. The committed
`railway.toml` builds the Vite assets, starts the server, and checks
`/api/health`.

## Deploy

1. Create one Railway service from this repository and set its root directory
   to `/lens`.
2. Attach one persistent volume at `/data`. Railway exposes that mount through
   `RAILWAY_VOLUME_MOUNT_PATH`; LENS then uses `/data/lens.sqlite`
   automatically.
3. Keep `WORLDMONITOR_API_KEY` empty for the default self-hosted feed pipeline.
4. Generate a public domain and deploy. The UI and `/api/v1/*` are served by
   the same process, so no separate CORS or frontend service is required.
5. In the volume **Backups** tab, enable daily and weekly backups. Railway
   explicitly supports scheduled incremental backups for SQLite stored on a
   volume: [Railway volume backups](https://docs.railway.com/volumes/backups).

The health endpoint verifies that the process can query SQLite and reports the
latest briefing snapshot time. It intentionally does not make external
provider calls during deployment health checks.

## Cost boundary

As of 26 July 2026, Railway Hobby is a **$5 monthly minimum** including $5 of
usage. CPU, memory, volume storage, and egress are usage-priced; current unit
prices and plan limits are published on [Railway pricing](https://railway.com/pricing)
and the billing behavior is explained in [Understanding your bill](https://docs.railway.com/pricing/understanding-your-bill).

For a low-traffic portfolio deployment, budget **$5–10/month**, then set a
compute usage alert and hard limit. This is an estimate, not a fixed quote:
map traffic, feed frequency, article images, CPU time, and retained volume
backups change the bill.

## Backup and restore

Use Railway's daily and weekly volume backup schedules. A restore creates a
replacement volume mounted at the same path and stages a redeploy. Test a
restore before relying on it. Wiping a volume also removes its backups, so a
portfolio owner who needs off-platform disaster recovery should additionally
download periodic SQLite copies.

## Deliberate single-node limit

SQLite and the in-process schedulers require **one running replica**. Do not
turn on horizontal replicas: each replica would poll the same feeds and contend
for one database volume. Move ingestion to a queue and SQLite to managed
PostgreSQL only when one of these happens:

- sustained API latency exceeds the project target under measured traffic;
- the SQLite write lock becomes visible in metrics;
- the database approaches the plan's volume limit;
- multiple regions or more than one replica become a real requirement.

Until then, one service is cheaper, easier to inspect, and sufficient for the
portfolio scope.
