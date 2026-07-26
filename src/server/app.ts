import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { systemClock, type Clock } from "../core/fixtures";
import { registerReadApi } from "./api/routes";
import { LensStore } from "./store";

interface ServerOptions {
  store?: LensStore;
  databasePath?: string;
  now?: Clock;
  webRoot?: string;
}

const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

function registerWebApp(server: FastifyInstance, webRoot: string) {
  const root = resolve(webRoot);
  const index = join(root, "index.html");
  if (!existsSync(index)) return;
  const send = async (path: string, reply: FastifyReply) => {
    const file = resolve(root, path);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      return reply.code(404).send({ error: "not_found" });
    }
    const target = existsSync(file) ? file : index;
    return reply
      .header("cache-control", target === index ? "no-cache" : "public, max-age=31536000, immutable")
      .type(contentTypes[extname(target)] ?? "application/octet-stream")
      .send(await readFile(target));
  };
  server.get("/", (_request, reply) => send("index.html", reply));
  server.get<{ Params: { "*": string } }>("/*", (request, reply) =>
    send(request.params["*"], reply));
}

export function buildServer(options: ServerOptions = {}) {
  const server = Fastify({ logger: false });
  const store = options.store ?? new LensStore(options.databasePath);

  server.get("/api/health", async (_request, reply) => {
    try {
      store.database.prepare("SELECT 1").get();
      return {
        service: "lens",
        status: "ok",
        database: "ok",
        latestSnapshotAt: store.latestSnapshot()?.createdAt ?? null,
      };
    } catch {
      return reply.code(503).send({ service: "lens", status: "degraded", database: "unavailable" });
    }
  });
  registerReadApi(server, store, options.now ?? systemClock);
  registerWebApp(server, options.webRoot ?? process.env.LENS_WEB_ROOT ?? "dist");
  if (!options.store) server.addHook("onClose", () => store.close());

  return server;
}
