import { EventEmitter } from "node:events";
import type { FastifyInstance } from "fastify";

const updates = new EventEmitter();

export function publishBriefingUpdate(snapshotId: string) {
  updates.emit("briefing", snapshotId);
}

export function subscribeBriefingUpdates(listener: (snapshotId: string) => void) {
  updates.on("briefing", listener);
  return () => updates.off("briefing", listener);
}

export function sseBriefingMessage(snapshotId: string) {
  return `event: briefing\ndata: ${JSON.stringify({ snapshotId })}\n\n`;
}

export function registerBriefingStream(server: FastifyInstance) {
  server.get("/api/v1/stream", (request, reply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    });
    reply.raw.write("retry: 5000\n\n");
    const unsubscribe = subscribeBriefingUpdates((snapshotId) => {
      reply.raw.write(sseBriefingMessage(snapshotId));
    });
    const heartbeat = setInterval(() => reply.raw.write(": keepalive\n\n"), 25_000);
    request.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
    reply.hijack();
  });
}
