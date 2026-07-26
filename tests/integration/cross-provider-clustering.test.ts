import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseEvidence, parseObservation, type Observation } from "../../src/core/model";
import { LensStore } from "../../src/server/store";
import {
  groupCanonicalObservations,
  reconcileEvents,
} from "../../src/server/services/reconcile-events";

const observations = JSON.parse(
  readFileSync(
    new URL("../fixtures/clustering/cross-provider/events.json", import.meta.url),
    "utf8",
  ),
).map(parseObservation) as Observation[];

describe("cross-provider reconciliation", () => {
  it("merges corroborating observations but keeps an unrelated nearby event separate", () => {
    const groups = groupCanonicalObservations(observations);
    expect(groups.map(({ observations: items }) => items.map(({ id }) => id))).toEqual([
      ["usgs:quake-1", "worldmonitor:quake-1"],
      ["worldmonitor:storm-1"],
    ]);
    expect(groups[0].mergeReasons).toEqual(["merge.title_similarity"]);
  });

  it("preserves both source identities and evidence records", () => {
    const store = new LensStore();
    for (const observation of observations) {
      store.saveObservation(observation);
      store.saveEvidence(parseEvidence({
        id: `${observation.id}:evidence`,
        observationId: observation.id,
        sourceId: observation.providerSourceId,
        sourceFamily: observation.sourceFamily,
        url: observation.url,
        publishedAt: observation.occurredAt,
        fetchedAt: observation.fetchedAt,
        title: observation.title,
      }));
    }

    const reconciled = reconcileEvents(store);
    expect(reconciled).toHaveLength(2);
    expect(reconciled[0].event).toMatchObject({
      title: "M 6.1 earthquake strikes Example region",
      evidenceIds: [
        "usgs:quake-1:evidence",
        "worldmonitor:quake-1:evidence",
      ],
      sourceFamilies: ["usgs", "gdacs"],
    });
    store.close();
  });
});
