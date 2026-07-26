import {
  parseBriefingSnapshot,
  type BriefingSnapshot,
} from "../../core/model";
import type { LensStore } from "./lens-store";

function materialState(snapshot: BriefingSnapshot) {
  return JSON.stringify({
    eventIds: snapshot.eventIds,
    categoryScores: snapshot.categoryScores,
    rankingVersion: snapshot.rankingVersion,
    providerHealth: snapshot.providerHealth,
  });
}

export function persistBriefingSnapshot(store: LensStore, value: BriefingSnapshot) {
  const snapshot = parseBriefingSnapshot(value);
  const latest = store.latestSnapshot();
  if (latest && materialState(latest) === materialState(snapshot)) {
    return { created: false, snapshot: latest };
  }
  store.appendSnapshot(snapshot);
  return { created: true, snapshot };
}

export function snapshotHoursAgo(store: LensStore, now: string, hours = 24) {
  const timestamp = Date.parse(now);
  if (!Number.isFinite(timestamp) || !Number.isFinite(hours) || hours < 0) {
    throw new Error("invalid_snapshot_lookup");
  }
  return store.snapshotAtOrBefore(new Date(timestamp - hours * 3_600_000).toISOString());
}
