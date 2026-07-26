export const DISASTER_IMPACT_VERSION = "disaster-impact-v1";

export const ALERT_FLOORS = {
  green: 0,
  yellow: 55,
  orange: 75,
  red: 90,
} as const;

export type DisasterAlert = keyof typeof ALERT_FLOORS;
