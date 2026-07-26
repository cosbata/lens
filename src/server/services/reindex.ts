import type { Observation } from "../../core/model";
import { inferNewsLocation } from "../../upstream/worldmonitor/geography";
import type { LensStore } from "../store";
import { rebuildBriefing } from "./ingest-usgs";

export function reindexedRssObservation(observation: Observation): Observation {
  if (observation.provider !== "rss") return observation;
  const location = inferNewsLocation(`${observation.title} ${observation.description}`);
  return {
    ...observation,
    geometry: location.geometry,
    affectedCountries: location.affectedCountries,
    measurements: {
      ...observation.measurements,
      locationPrecision: location.precision,
      locationDisplayName: location.displayName ?? "Not precisely mapped",
    },
    extension: {
      ...observation.extension,
      locationPrecision: location.precision,
      locationDisplayName: location.displayName ?? "",
      locationMatchedTerms: location.matchedTerms.join(","),
      locationReferenceVersion: location.referenceVersion,
    },
  };
}

export function reindexStoredLocations(
  store: LensStore,
  { dryRun = false, now = new Date().toISOString() } = {},
) {
  const changes = store.observations().flatMap((previous) => {
    const observation = reindexedRssObservation(previous);
    if (JSON.stringify(previous) === JSON.stringify(observation)) return [];
    if (!dryRun) {
      store.saveObservation(observation);
      const event = store.event(`event:${observation.id}`);
      if (event) {
        store.saveEvent({
          ...event,
          geometry: observation.geometry,
          affectedCountries: observation.affectedCountries,
          measurements: observation.measurements,
        });
      }
    }
    return [{ id: observation.id, from: previous.geometry, to: observation.geometry }];
  });
  if (!dryRun && changes.length > 0) rebuildBriefing(store, now);
  return { dryRun, changed: changes.length, changes };
}
