import type { FastifyInstance } from "fastify";
import { compareSnapshots, type ComparedEvent } from "../../core/compare/snapshots";
import type { BriefingSnapshot, EventScore } from "../../core/model";
import type { LensStore } from "../store";

function atSnapshot(store: LensStore, snapshot: BriefingSnapshot): ComparedEvent[] {
  return snapshot.eventIds.flatMap((eventId) => {
    const event = store.event(eventId);
    if (!event) return [];
    const score = store.eventScores(eventId).find(
      (item: EventScore) => Date.parse(item.calculatedAt) <= Date.parse(snapshot.createdAt),
    ) ?? null;
    return [{ event, score }];
  });
}

export function registerComparisonApi(server: FastifyInstance, store: LensStore) {
  server.get<{ Querystring: { from?: string; to?: string } }>(
    "/api/v1/comparison",
    async (request, reply) => {
      const { from, to } = request.query;
      if (!from || !to || !Number.isFinite(Date.parse(from)) || !Number.isFinite(Date.parse(to))) {
        return reply.code(400).send({ error: "invalid_comparison_range" });
      }
      const before = store.snapshotAtOrBefore(from);
      const after = store.snapshotAtOrBefore(to);
      if (!before || !after) return reply.code(404).send({ error: "comparison_snapshot_not_found" });
      return {
        from: before.createdAt,
        to: after.createdAt,
        changes: compareSnapshots(atSnapshot(store, before), atSnapshot(store, after)),
      };
    },
  );
}
