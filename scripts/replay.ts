import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runFixturePipeline, type ReplayFixture } from "../src/core/pipeline/replay";

const flag = process.argv.indexOf("--fixture");
const path = flag >= 0 ? process.argv[flag + 1] : undefined;
if (!path) throw new Error("usage: npm run replay -- --fixture <path>");

const fixture = JSON.parse(readFileSync(resolve(path), "utf8")) as ReplayFixture;
process.stdout.write(`${JSON.stringify(runFixturePipeline(fixture))}\n`);
