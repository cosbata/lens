export interface StoryVector {
  u: Float64Array;
  b: Float64Array;
  t?: Set<string>;
}

export const STORY_SIMILARITY_THRESHOLD: number;
export function normalizeStoryText(text: string): string;
export function stripAttributionSuffix(text: string): string;
export function candidateTokens(text: string): Set<string>;
export function storyVector(text: string): StoryVector | null;
export function cosineSimilarity(
  left: StoryVector | null,
  right: StoryVector | null,
): number;
export function storySimilarity(left: string, right: string): number;
export function isSameStory(
  left: string,
  right: string,
  threshold?: number,
): boolean;
export function clusterTexts(
  texts: string[],
  options?: { threshold?: number },
): number[][];
export function setStoryVectorProvider(
  provider: ((text: string) => StoryVector | null) | null,
): void;
