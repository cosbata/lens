import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clusterObservations,
  decideMerge,
  type ClusterObservation,
} from "../../../src/core/cluster/deterministic";

const base: ClusterObservation = {
  id: "a",
  provider: "wire",
  providerSourceId: "a",
  canonicalUrl: "",
  title: "Strong earthquake strikes Example region",
  eventType: "earthquake",
  entities: ["Example"],
  locationKey: "KR",
  occurredAt: "2026-07-25T10:00:00Z",
};
const cases = JSON.parse(
  readFileSync(new URL("../../fixtures/clustering/cases.json", import.meta.url), "utf8"),
) as Array<{
  name: string;
  expected: string;
  left: Partial<ClusterObservation>;
  right: Partial<ClusterObservation>;
}>;

describe("deterministic clustering", () => {
  it.each(cases)("$name", ({ expected, left, right }) => {
    expect(decideMerge(
      { ...base, ...left },
      { ...base, id: "b", providerSourceId: "b", ...right },
    ).reason).toBe(expected);
  });

  it("returns stable clusters regardless of input order", () => {
    const duplicate = {
      ...base,
      id: "b",
      provider: "local",
      providerSourceId: "b",
      title: "Strong earthquake hits Example region",
    };
    const separate = { ...base, id: "c", providerSourceId: "c", locationKey: "JP" };

    expect(clusterObservations([separate, duplicate, base]))
      .toEqual([["a", "b"], ["c"]]);
  });

  it("keeps provider identity and canonical URLs stable across location revisions", () => {
    expect(decideMerge(
      { ...base, locationKey: "1:1", canonicalUrl: "https://example.test/event" },
      {
        ...base,
        id: "b",
        providerSourceId: "b",
        locationKey: "2:2",
        canonicalUrl: "https://example.test/event",
      },
    )).toMatchObject({ merge: true, reason: "merge.canonical_url" });
  });

  it("merges RSS reports about one named-place incident within four days", () => {
    expect(decideMerge(
      {
        ...base,
        id: "rss:bordeaux-1",
        provider: "rss",
        providerSourceId: "bordeaux-1",
        title: "Firefighters battle a wildfire near Bordeaux",
        eventType: "climate-environment",
        entities: ["FR"],
        locationKey: "-1:45",
        locationPrecision: "named_hub",
        occurredAt: "2026-07-24T08:00:00Z",
      },
      {
        ...base,
        id: "rss:bordeaux-2",
        provider: "rss",
        providerSourceId: "bordeaux-2",
        title: "Evacuations continue as forest fires spread in Gironde",
        eventType: "conflict",
        entities: ["FR"],
        locationKey: "-1:45",
        locationPrecision: "named_hub",
        occurredAt: "2026-07-27T08:00:00Z",
      },
    )).toMatchObject({ merge: true, reason: "merge.named_incident" });
  });
});
