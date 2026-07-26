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
    const separate = { ...base, id: "c", locationKey: "JP" };

    expect(clusterObservations([separate, duplicate, base]))
      .toEqual([["a", "b"], ["c"]]);
  });
});
