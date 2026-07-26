import { describe, expect, it } from "vitest";
import {
  publishBriefingUpdate,
  sseBriefingMessage,
  subscribeBriefingUpdates,
} from "../../src/server/api/stream";

describe("briefing update stream", () => {
  it("publishes only the snapshot identifier as a refetch signal", () => {
    const received: string[] = [];
    const unsubscribe = subscribeBriefingUpdates((id) => received.push(id));
    publishBriefingUpdate("snapshot-42");
    unsubscribe();

    expect(received).toEqual(["snapshot-42"]);
    expect(sseBriefingMessage("snapshot-42")).toBe(
      'event: briefing\ndata: {"snapshotId":"snapshot-42"}\n\n',
    );
  });
});
