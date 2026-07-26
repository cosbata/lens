import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildServer } from "../../src/server/app";
import { LensStore } from "../../src/server/store";

const cleanup: Array<() => void> = [];
afterEach(() => cleanup.splice(0).forEach((run) => run()));

describe("single production service", () => {
  it("serves the web build, API, and SQLite readiness from one Fastify process", async () => {
    const root = mkdtempSync(join(tmpdir(), "lens-web-"));
    mkdirSync(join(root, "assets"));
    writeFileSync(join(root, "index.html"), "<main>LENS production</main>");
    writeFileSync(join(root, "assets", "app.css"), "body{color:black}");
    writeFileSync(join(root, "assets", "map-worker.mjs"), "self.worker = true");
    const store = new LensStore();
    const server = buildServer({ store, webRoot: root });
    cleanup.push(() => {
      store.close();
      rmSync(root, { recursive: true, force: true });
    });

    const page = await server.inject({ method: "GET", url: "/" });
    const asset = await server.inject({ method: "GET", url: "/assets/app.css" });
    const worker = await server.inject({ method: "GET", url: "/assets/map-worker.mjs" });
    const health = await server.inject({ method: "GET", url: "/api/health" });

    expect(page.body).toContain("LENS production");
    expect(asset.headers["cache-control"]).toContain("immutable");
    expect(worker.headers["content-type"]).toContain("text/javascript");
    expect(health.json()).toMatchObject({ status: "ok", database: "ok" });
  });
});
