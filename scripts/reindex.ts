import { join } from "node:path";
import { LensStore } from "../src/server/store";
import { reindexStoredLocations } from "../src/server/services/reindex";

const valueAfter = (flag: string) => {
  const index = process.argv.indexOf(flag);
  return index < 0 ? undefined : process.argv[index + 1];
};
const databasePath = valueAfter("--database")
  ?? process.env.LENS_DB_PATH
  ?? (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "lens.sqlite")
    : "lens.sqlite");
const store = new LensStore(databasePath);

try {
  process.stdout.write(`${JSON.stringify(reindexStoredLocations(store, {
    dryRun: process.argv.includes("--dry-run"),
  }), null, 2)}\n`);
} finally {
  store.close();
}
