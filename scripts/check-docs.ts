import { access, readFile } from "node:fs/promises";
import { validateLicenseProvenance } from "./check-licenses";

const required = [
  "README.md",
  ".env.example",
  "LICENSE",
  "CONTRIBUTING.md",
  "docs/architecture.md",
  "docs/case-study.md",
  "docs/deployment.md",
  "docs/evaluation.md",
  "docs/methodology.md",
  "docs/providers.md",
  "docs/upstream-worldmonitor.md",
];

await Promise.all(required.map((path) => access(path)));
const licenseErrors = await validateLicenseProvenance();
if (licenseErrors.length > 0) {
  throw new Error(`invalid_license_provenance:${licenseErrors.join(",")}`);
}
const readme = await readFile("README.md", "utf8");
for (const heading of [
  "## What is implemented",
  "## Run the deterministic fixture",
  "## Run the web experience",
  "## Verify it",
  "## How it works",
  "## Project boundaries",
]) {
  if (!readme.includes(heading)) throw new Error(`missing_readme_section:${heading}`);
}
for (const target of [
  "docs/architecture.md",
  "docs/methodology.md",
  "docs/providers.md",
  "docs/evaluation.md",
  "docs/case-study.md",
  "docs/deployment.md",
  "docs/upstream-worldmonitor.md",
  "CONTRIBUTING.md",
  "LICENSE",
]) {
  if (!readme.includes(`(${target})`)) throw new Error(`missing_readme_link:${target}`);
}
for (const requiredText of ["BarentsWatch", "production.json", "claim of production accuracy"]) {
  if (!readme.includes(requiredText)) throw new Error(`missing_readme_text:${requiredText}`);
}

console.log(`documentation valid: ${required.length} required files`);
