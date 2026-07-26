import type { EventCluster, EventScore } from "../model";

export type ComparedEvent = {
  event: EventCluster;
  score: EventScore | null;
};

export type EventChange = {
  eventId: string;
  title: string;
  category: EventCluster["primaryCategory"];
  status: "added" | "changed" | "easing" | "resolved" | "unchanged";
  beforeScore: number | null;
  afterScore: number | null;
  delta: number | null;
};

export function compareSnapshots(before: ComparedEvent[], after: ComparedEvent[]): EventChange[] {
  const previous = new Map(before.map((item) => [item.event.id, item]));
  const current = new Map(after.map((item) => [item.event.id, item]));
  return [...new Set([...previous.keys(), ...current.keys()])].map((eventId) => {
    const oldItem = previous.get(eventId);
    const newItem = current.get(eventId);
    const event = newItem?.event ?? oldItem!.event;
    const beforeScore = oldItem?.score?.finalScore ?? null;
    const afterScore = newItem?.score?.finalScore ?? null;
    const delta = beforeScore === null || afterScore === null
      ? null
      : Math.round((afterScore - beforeScore) * 10) / 10;
    const status = !oldItem
      ? "added"
      : !newItem
        ? "resolved"
        : delta !== null && delta <= -5
          ? "easing"
          : (delta !== null && Math.abs(delta) >= 5) ||
              oldItem.event.lastMaterialUpdateAt !== newItem.event.lastMaterialUpdateAt
            ? "changed"
            : "unchanged";
    return {
      eventId,
      title: event.title,
      category: event.primaryCategory,
      status,
      beforeScore,
      afterScore,
      delta,
    };
  });
}
