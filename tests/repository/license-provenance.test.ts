import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateLicenseProvenance } from "../../scripts/check-licenses";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) =>
    rm(path, { recursive: true, force: true })));
});

describe("license provenance", () => {
  it("keeps the repository AGPL source boundary complete", async () => {
    await expect(validateLicenseProvenance()).resolves.toEqual([]);
  });

  it("rejects a provenance record without the pinned upstream commit", async () => {
    const root = await mkdtemp(join(tmpdir(), "lens-license-"));
    temporaryRoots.push(root);
    await mkdir(join(root, "docs"));
    await Promise.all([
      writeFile(join(root, "LICENSE"),
        "GNU AFFERO GENERAL PUBLIC LICENSE\nVersion 3, 19 November 2007"),
      writeFile(join(root, "package.json"), JSON.stringify({
        license: "AGPL-3.0-only",
        repository: { url: "https://example.test/lens.git", directory: "lens" },
      })),
      writeFile(join(root, "README.md"),
        "GNU AGPL-3.0-only docs/upstream-worldmonitor.md LENS source repository"),
      writeFile(join(root, "docs/upstream-worldmonitor.md"), [
        "https://github.com/koala73/worldmonitor",
        "AGPL-3.0-only",
        "## Copied-file manifest",
        "## Modification log",
        "not affiliated with",
        "complete corresponding source",
      ].join("\n")),
    ]);

    await expect(validateLicenseProvenance(root))
      .resolves.toContain("pinned_commit");
  });
});
