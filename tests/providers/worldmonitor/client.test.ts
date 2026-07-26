import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWorldMonitorFeedDigest,
  fetchWorldMonitorIranEvents,
} from "../../../src/providers/worldmonitor/client";

afterEach(() => {
  delete process.env.WORLDMONITOR_API_KEY;
});

function fetcher() {
  const response = { ok: true, json: async () => ({}) } as Response;
  return vi.fn(async () => response) as unknown as typeof fetch;
}

describe("WorldMonitor client", () => {
  it("keeps the API key server-side in the documented header", async () => {
    process.env.WORLDMONITOR_API_KEY = `wm_${"a".repeat(40)}`;
    const load = fetcher();

    await fetchWorldMonitorIranEvents(load, "https://api.worldmonitor.test");

    const [url, init] = vi.mocked(load).mock.calls[0];
    expect(String(url)).toBe("https://api.worldmonitor.test/api/conflict/v1/list-iran-events");
    expect(init?.headers).toMatchObject({
      accept: "application/json",
      "X-WorldMonitor-Key": `wm_${"a".repeat(40)}`,
    });
  });

  it("requests the full English digest", async () => {
    const load = fetcher();

    await fetchWorldMonitorFeedDigest(load, "https://api.worldmonitor.test");

    expect(String(vi.mocked(load).mock.calls[0][0])).toBe(
      "https://api.worldmonitor.test/api/news/v1/list-feed-digest?variant=full&lang=en",
    );
  });

  it("rejects malformed secrets before sending a request", async () => {
    process.env.WORLDMONITOR_API_KEY = "not-a-key";
    const load = fetcher();

    await expect(fetchWorldMonitorIranEvents(load)).rejects.toThrow("worldmonitor_api_key_invalid");
    expect(load).not.toHaveBeenCalled();
  });
});
