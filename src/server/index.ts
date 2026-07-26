import { loadEnvFile } from 'node:process';
import { join } from 'node:path';
import { buildServer } from './app';
import { startNonOverlappingPoller } from './scheduler/non-overlapping';
import { ingestUsgs } from './services/ingest-usgs';
import { ingestWorldMonitor } from './services/ingest-worldmonitor';
import { ingestEonet } from './services/ingest-eonet';
import { ingestBarentsWatchTrack } from './services/ingest-barentswatch';
import { ingestRss } from './services/ingest-rss';
import { LensStore } from './store';

try {
  loadEnvFile();
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';
const store = new LensStore(
  process.env.LENS_DB_PATH
  ?? (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'lens.sqlite')
    : 'lens.sqlite'),
);
const server = buildServer({ store });
const stopRss = startNonOverlappingPoller(
  () => ingestRss({ store, now: () => new Date() }).then(() => undefined),
  Number(process.env.RSS_POLL_MS ?? 10 * 60_000),
);
const stopUsgs = startNonOverlappingPoller(
  () => ingestUsgs({ store, now: () => new Date() }).then(() => undefined),
  Number(process.env.USGS_POLL_MS ?? 5 * 60_000),
);
const stopWorldMonitor = process.env.WORLDMONITOR_API_KEY?.trim()
  ? startNonOverlappingPoller(
      () => ingestWorldMonitor({ store, now: () => new Date() }).then(() => undefined),
      Number(process.env.WORLDMONITOR_POLL_MS ?? 10 * 60_000),
    )
  : () => {};
const stopEonet = startNonOverlappingPoller(
  () => ingestEonet({ store, now: () => new Date() }).then(() => undefined),
  Number(process.env.EONET_POLL_MS ?? 15 * 60_000),
);
const barentswatchConfig = {
  eventId: process.env.BARENTSWATCH_EVENT_ID,
  mmsi: Number(process.env.BARENTSWATCH_MMSI),
  clientId: process.env.BARENTSWATCH_CLIENT_ID,
  clientSecret: process.env.BARENTSWATCH_CLIENT_SECRET,
};
const stopBarentsWatch = Object.values(barentswatchConfig).every(Boolean)
  ? startNonOverlappingPoller(
      () => ingestBarentsWatchTrack({
        store,
        eventId: barentswatchConfig.eventId!,
        mmsi: barentswatchConfig.mmsi,
        clientId: barentswatchConfig.clientId!,
        clientSecret: barentswatchConfig.clientSecret!,
        now: () => new Date(),
      }).then(() => undefined),
      Number(process.env.BARENTSWATCH_POLL_MS ?? 15 * 60_000),
    )
  : () => {};
server.addHook('onClose', () => {
  stopRss();
  stopUsgs();
  stopWorldMonitor();
  stopEonet();
  stopBarentsWatch();
  store.close();
});

try {
  await server.listen({ host, port });
} catch (error) {
  server.log.error(error);
  process.exitCode = 1;
}
