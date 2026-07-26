import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PINNED_WORLD_MONITOR_COMMIT =
  "d9ef780be65caf6669d352dade30fd2d777048eb";

async function text(root: string, path: string) {
  return readFile(resolve(root, path), "utf8");
}

export async function validateLicenseProvenance(root = process.cwd()) {
  const errors: string[] = [];
  const [license, packageText, readme, provenance] = await Promise.all([
    text(root, "LICENSE"),
    text(root, "package.json"),
    text(root, "README.md"),
    text(root, "docs/upstream-worldmonitor.md"),
  ]);
  const packageJson = JSON.parse(packageText) as {
    license?: string;
    repository?: { url?: string; directory?: string };
  };

  if (!license.includes("GNU AFFERO GENERAL PUBLIC LICENSE")
    || !license.includes("Version 3, 19 November 2007")) {
    errors.push("license_text");
  }
  if (packageJson.license !== "AGPL-3.0-only") errors.push("package_license");
  if (packageJson.repository?.url !== "https://github.com/cosbata/lens.git") {
    errors.push("source_repository");
  }
  for (const [name, value] of [
    ["upstream_repository", "https://github.com/koala73/worldmonitor"],
    ["pinned_commit", PINNED_WORLD_MONITOR_COMMIT],
    ["upstream_license", "AGPL-3.0-only"],
    ["copied_manifest", "## Copied-file manifest"],
    ["modification_log", "## Modification log"],
    ["trademark_separation", "not affiliated with"],
    ["source_offer", "complete corresponding source"],
  ] as const) {
    if (!provenance.includes(value)) errors.push(name);
  }
  if (!readme.includes("GNU AGPL-3.0-only")
    || !readme.includes("docs/upstream-worldmonitor.md")
    || !readme.includes("LENS source repository")) {
    errors.push("readme_notice");
  }
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await validateLicenseProvenance();
  if (errors.length > 0) throw new Error(errors.join(","));
  console.log("license and upstream provenance valid");
}
