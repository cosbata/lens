import { RSS_FEEDS } from "../src/config/rss-feeds";
import { ingestRss } from "../src/server/services/ingest-rss";
import { LensStore } from "../src/server/store";

const categories = new Set<string>();
const feeds = RSS_FEEDS.filter(({ categoryHint }) => {
  if (categories.has(categoryHint)) return false;
  categories.add(categoryHint);
  return true;
});
const store = new LensStore();

try {
  const result = await ingestRss({
    store,
    feeds,
    now: () => new Date(),
    loadImage: async () => undefined,
  });
  const events = store.events();
  const precision = events.reduce<Record<string, number>>((counts, event) => {
    const value = String(event.measurements.locationPrecision ?? "unmapped");
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
  const sourceFamilies = new Set(events.flatMap(({ sourceFamilies }) => sourceFamilies));
  const snapshot = store.latestSnapshot();

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    mode: "bounded_live_observation",
    feeds: { checked: result.feeds, healthy: result.healthy },
    candidates: result.items,
    canonicalStories: result.stories,
    duplicateCompression: result.items
      ? Number((1 - result.stories / result.items).toFixed(3))
      : 0,
    categoryCoverage: [...new Set(events.map(({ primaryCategory }) => primaryCategory))].sort(),
    mappedPrecision: precision,
    sourceDiversity: sourceFamilies.size,
    selectedStories: snapshot?.eventIds.length ?? 0,
    limitation: "Live availability changes; this smoke report is observational and is not an accuracy claim.",
  }, null, 2));
} finally {
  store.close();
}
