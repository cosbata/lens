export type StoryThreadNode = {
  id: string;
  title: string;
  occurredAt: string;
  category: string;
};

export type StoryThreadClaim = {
  fromEventId: string;
  toEventId: string;
  relation: "contributes-to" | "amplifies" | "disrupts" | "responds-to";
  explanation: string;
  sourceUrl: string;
};

export function buildStoryThread(
  events: StoryThreadNode[],
  claims: StoryThreadClaim[],
) {
  const byId = new Map(events.map((event) => [event.id, event]));
  if (byId.size !== events.length) throw new Error("story_thread_duplicate_event");
  const links = claims.map((claim) => {
    if (
      claim.fromEventId === claim.toEventId ||
      !byId.has(claim.fromEventId) ||
      !byId.has(claim.toEventId)
    ) {
      throw new Error("story_thread_invalid_link");
    }
    try {
      new URL(claim.sourceUrl);
    } catch {
      throw new Error("story_thread_invalid_source");
    }
    return { ...claim };
  });
  return {
    events: [...events].sort(
      (left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id),
    ),
    links,
  };
}
