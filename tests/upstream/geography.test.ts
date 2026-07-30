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

  it("maps current wildfire subregions to real supported coordinates", () => {
    expect(inferNewsLocation("Firefighters battle a wildfire near Bordeaux"))
      .toMatchObject({
        precision: "named_hub",
        displayName: "Bordeaux, Gironde",
        geometry: { type: "Point", coordinates: [-0.5800364, 44.841225] },
      });
    expect(inferNewsLocation("Wildfires spread through Cenicientos near Madrid"))
      .toMatchObject({
        precision: "unmapped",
        displayName: "Multiple named locations",
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

  it("uses a mainland representative point for countries with overseas territory", () => {
    expect(inferNewsLocation("Wildfires spread across France")).toMatchObject({
      precision: "country_approximate",
      affectedCountries: ["FR"],
      geometry: { type: "Point", coordinates: [2.3522, 48.8566] },
    });
    expect(inferNewsLocation("National policy changes across Russia")).toMatchObject({
      precision: "country_approximate",
      affectedCountries: ["RU"],
      geometry: { type: "Point", coordinates: [37.6173, 55.7558] },
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
        referenceVersion: "lens-places-v2",
    });
  });

  it("does not pick an arbitrary point when several named places are present", () => {
    expect(inferNewsLocation("Washington DC and Moscow discuss developments in Kyiv"))
      .toMatchObject({
        geometry: null,
        precision: "unmapped",
        displayName: "Multiple named locations",
        affectedCountries: ["US", "RU", "UA"],
      });
  });

  it("recognizes Türkiye without relying on an ambiguous generated alias", () => {
    expect(inferNewsLocation("Türkiye announces a national election"))
      .toMatchObject({
        precision: "country_approximate",
        affectedCountries: ["TR"],
      });
  });
});
