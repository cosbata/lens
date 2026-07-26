import {
  parseBriefingSnapshot,
  type BriefingSnapshot,
  type CategoryScore,
  type ProviderRun,
} from "../../core/model";

export interface BuildBriefingInput {
  id: string;
  createdAt: string;
  eventIds: string[];
  categoryScores: CategoryScore[];
  rankingVersion: string;
  providerRuns: ProviderRun[];
}

export function buildBriefingSnapshot(input: BuildBriefingInput): BriefingSnapshot {
  const latestByProvider = new Map<string, ProviderRun>();
  for (const run of [...input.providerRuns].sort(
    (left, right) => left.startedAt.localeCompare(right.startedAt),
  )) {
    latestByProvider.set(run.provider, run);
  }

  return parseBriefingSnapshot({
    id: input.id,
    createdAt: input.createdAt,
    eventIds: input.eventIds,
    categoryScores: input.categoryScores,
    rankingVersion: input.rankingVersion,
    providerHealth: [...latestByProvider.values()]
      .sort((left, right) => left.provider.localeCompare(right.provider))
      .map(({ provider, state, stale }) => ({ provider, state, stale })),
  });
}
