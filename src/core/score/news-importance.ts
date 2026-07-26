import type { FeedAuthority } from "../../config/rss-feeds";
import sourceTiers from "../../upstream/worldmonitor/source-tiers.json";
import diplomacy from "../../upstream/worldmonitor/diplomacy-keywords.json";

export const NEWS_SCORE_VERSION = "wm-lens-news-v1";
export type NewsThreatLevel = "critical" | "high" | "medium" | "low" | "info";

const severityScores: Record<NewsThreatLevel, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
  info: 0,
};
const authorityTier: Record<FeedAuthority, 1 | 2 | 3> = {
  official: 1,
  established: 2,
  specialist: 3,
};
const tierScores = [0, 100, 75, 50, 25];
const tiers = sourceTiers as Record<string, number>;
const lower = (value: string) => value.toLowerCase();

function hasDiplomacySignal(title: string) {
  const value = lower(title);
  return diplomacy.diplomacyFlashpointPairs.some(
    ([entity, action]) => value.includes(entity) && value.includes(action),
  ) || (
    diplomacy.diplomacyKeywords.some((keyword) => value.includes(keyword))
    && diplomacy.flashpointKeywords.some((keyword) => value.includes(keyword))
  );
}

export function sourceTier(source: string, authority?: FeedAuthority) {
  const configured = tiers[source];
  return configured === 1 || configured === 2 || configured === 3 || configured === 4
    ? configured
    : authority ? authorityTier[authority] : 4;
}

export function calculateNewsImportance({
  level,
  source,
  authority,
  corroborationCount,
  publishedAt,
  now,
  title,
  entityCorroborationCount = 0,
}: {
  level: NewsThreatLevel;
  source: string;
  authority?: FeedAuthority;
  corroborationCount: number;
  publishedAt: string;
  now: string;
  title: string;
  entityCorroborationCount?: number;
}) {
  const tier = sourceTier(source, authority);
  const severity = severityScores[level];
  const sourceTrust = tierScores[tier];
  const corroboration = Math.min(Math.max(corroborationCount, entityCorroborationCount, 0), 5) * 20;
  const age = Math.max(0, Date.parse(now) - Date.parse(publishedAt));
  const recency = Math.max(0, 1 - age / 86_400_000) * 100;
  const diplomacyBonus = hasDiplomacySignal(title) ? 18 : 0;
  const entityBonus = Math.min(Math.max(entityCorroborationCount, 0), 5) * 4;
  const base = Math.round(
    severity * .55 + sourceTrust * .20 + corroboration * .15 + recency * .10,
  );
  const finalScore = Math.min(100, Math.round(base + diplomacyBonus + entityBonus));
  return {
    version: NEWS_SCORE_VERSION,
    finalScore,
    tier,
    components: { severity, sourceTrust, corroboration, recency },
    bonuses: { diplomacy: diplomacyBonus, entityCorroboration: entityBonus },
    reasons: [
      `severity.${level}.${severity}`,
      `source_tier.${tier}.${sourceTrust}`,
      `distinct_sources.${Math.max(0, corroborationCount)}.${corroboration}`,
      `recency.${Math.round(recency)}`,
      ...(diplomacyBonus ? [`diplomacy_flashpoint.${diplomacyBonus}`] : []),
      ...(entityBonus ? [`entity_corroboration.${entityBonus}`] : []),
      ...(base + diplomacyBonus + entityBonus > 100 ? ["public_score.clamped_100"] : []),
    ],
  };
}
