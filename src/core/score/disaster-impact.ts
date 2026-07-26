import {
  ALERT_FLOORS,
  DISASTER_IMPACT_VERSION,
  type DisasterAlert,
} from "./impact-config";

export interface EarthquakeImpactInput {
  magnitude: number;
  significance: number;
  felt: number | null;
  tsunami: boolean;
  alert: DisasterAlert | null;
}

export interface DisasterImpact {
  domainImpact: number;
  version: typeof DISASTER_IMPACT_VERSION;
  components: {
    physicalIntensity: number;
    providerSignificance: number;
    publicExposure: number;
    tsunami: number;
  };
  floor: number;
  reasons: string[];
}

const clamp = (value: number) => Math.min(100, Math.max(0, value));
const round = (value: number) => Math.round(value * 10) / 10;

export function calculateEarthquakeImpact(input: EarthquakeImpactInput): DisasterImpact {
  const { magnitude, significance, felt, tsunami, alert } = input;
  if (
    !Number.isFinite(magnitude) ||
    magnitude < 0 ||
    !Number.isFinite(significance) ||
    significance < 0 ||
    (felt !== null && (!Number.isFinite(felt) || felt < 0))
  ) {
    throw new Error("invalid_earthquake_measurements");
  }

  const physicalIntensity = clamp((magnitude - 3) * 20);
  const providerSignificance = clamp(significance / 10);
  const publicExposure = felt === null ? 0 : clamp(Math.log10(felt + 1) * 30);
  const tsunamiComponent = tsunami ? 100 : 0;
  const raw = round(
    physicalIntensity * 0.55 +
      providerSignificance * 0.25 +
      publicExposure * 0.1 +
      tsunamiComponent * 0.1,
  );
  const floor = alert === null ? 0 : ALERT_FLOORS[alert];
  const domainImpact = Math.max(raw, floor);
  const reasons = [
    `magnitude.${magnitude}`,
    `significance.${significance}`,
    tsunami ? "tsunami.possible" : null,
    floor > raw ? `floor.alert_${alert}` : null,
  ].filter((reason): reason is string => reason !== null);

  return {
    domainImpact,
    version: DISASTER_IMPACT_VERSION,
    components: {
      physicalIntensity: round(physicalIntensity),
      providerSignificance: round(providerSignificance),
      publicExposure: round(publicExposure),
      tsunami: tsunamiComponent,
    },
    floor,
    reasons,
  };
}
