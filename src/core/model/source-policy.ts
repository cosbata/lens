export const SOURCE_AUTHORITY = {
  official: 100,
  institutional: 85,
  specialist: 70,
  established: 55,
  unknown: 25,
} as const;

export type AuthorityBand = keyof typeof SOURCE_AUTHORITY;

export interface ConfidenceSource {
  sourceId: string;
  sourceFamily: string;
  authority: AuthorityBand;
  structured: boolean;
  completeness: number;
}

export const BRIEFING_CONFIDENCE_FLOOR = 45;
