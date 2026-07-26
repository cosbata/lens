import { describe, expect, it } from "vitest";
import { inferNewsLocation } from "../../src/upstream/worldmonitor/geography";

describe("honest news geography", () => {
  it("uses a named hub only when a specific place is present", () => {
    expect(inferNewsLocation("Traffic resumes through the Strait of Hormuz"))
      .toMatchObject({
        precision: "named_hub",
        displayName: "Strait of Hormuz",
        geometry: { type: "Point", coordinates: [56.5, 26.5] },
      });
  });

  it("labels a country-center fallback as approximate", () => {
    const location = inferNewsLocation("National election begins across Australia");
    expect(location).toMatchObject({
      precision: "country_approximate",
      affectedCountries: ["AU"],
      displayName: "Australia",
      geometry: { type: "Point" },
    });
  });

  it("prefers a named subnational place over a country-center fallback", () => {
    expect(inferNewsLocation("Health teams met local officials in Bunia, DR Congo"))
      .toMatchObject({
        precision: "named_hub",
        affectedCountries: ["CD"],
        displayName: "Bunia",
        geometry: { type: "Point", coordinates: [30.252, 1.559] },
      });
  });

  it("maps a supported subnational region phrase within its named country", () => {
    expect(inferNewsLocation(
      "DR Congo teams are working in eastern areas where the virus has taken hold",
    )).toMatchObject({
      precision: "named_hub",
      displayName: "Eastern DR Congo",
      geometry: { type: "Point", coordinates: [28.5, -1] },
    });
  });

  it("does not fabricate a marker when no place is supported", () => {
    expect(inferNewsLocation("Central bank publishes a policy statement"))
      .toEqual({
        geometry: null,
        affectedCountries: [],
        precision: "unmapped",
        matchedTerms: [],
        referenceVersion: "worldmonitor-d9ef780",
      });
  });
});
