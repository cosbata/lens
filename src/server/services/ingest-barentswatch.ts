import { fetchBarentsWatchTrack } from "../../providers/barentswatch/client";
import { normalizeBarentsWatchTrack } from "../../providers/barentswatch/normalize";
import { publishBriefingUpdate } from "../api/stream";
import type { LensStore } from "../store";

export async function ingestBarentsWatchTrack({
  store,
  eventId,
  mmsi,
  clientId,
  clientSecret,
  now,
  load = fetchBarentsWatchTrack,
}: {
  store: LensStore;
  eventId: string;
  mmsi: number;
  clientId: string;
  clientSecret: string;
  now: () => Date;
  load?: typeof fetchBarentsWatchTrack;
}) {
  const startedAt = now().toISOString();
  try {
    const event = store.event(eventId);
    if (!event) throw new Error("barentswatch_event_not_found");
    const { observation, evidence } = normalizeBarentsWatchTrack(
      await load({ clientId, clientSecret, mmsi }),
      now().toISOString(),
      mmsi,
    );
    const material =
      JSON.stringify(event.geometryHistory) !== JSON.stringify(observation.geometryHistory);
    store.saveObservation(observation);
    store.saveEvidence(evidence);
    store.saveEvent({
      ...event,
      geometry: observation.geometry,
      geometryHistory: observation.geometryHistory,
      lastSeenAt: observation.fetchedAt,
      lastMaterialUpdateAt: observation.occurredAt,
      evidenceIds: [...new Set([...event.evidenceIds, evidence.id])],
      sourceFamilies: [...new Set([...event.sourceFamilies, observation.sourceFamily])],
    });
    store.saveProviderRun({
      id: `barentswatch:${startedAt}`,
      provider: "barentswatch",
      startedAt,
      completedAt: now().toISOString(),
      state: "success",
      itemCount: observation.geometryHistory?.length ?? 0,
      stale: false,
    });
    const snapshot = store.latestSnapshot();
    if (material && snapshot?.eventIds.includes(eventId)) publishBriefingUpdate(snapshot.id);
    return { materialUpdates: material ? 1 : 0, snapshot };
  } catch (error) {
    store.saveProviderRun({
      id: `barentswatch:${startedAt}`,
      provider: "barentswatch",
      startedAt,
      completedAt: now().toISOString(),
      state: "degraded",
      itemCount: 0,
      stale: true,
      errorClass: error instanceof Error ? error.message : "unknown",
    });
    return { materialUpdates: 0, snapshot: null, error };
  }
}
