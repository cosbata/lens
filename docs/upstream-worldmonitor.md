# World Monitor upstream provenance

LENS is an independent project and is not affiliated with, endorsed by, or a
product of World Monitor or its maintainers. “World Monitor” identifies the
upstream project only; LENS does not use its logo or imply trademark ownership.

## Upstream

- Repository: <https://github.com/koala73/worldmonitor>
- Pinned commit: `d9ef780be65caf6669d352dade30fd2d777048eb`
- Upstream license: `AGPL-3.0-only`
- Upstream copyright notice: `Copyright (C) 2024-2026 Elie Habib`
- LENS corresponding source:
  <https://github.com/cosbata/lens>

The pinned commit is the review boundary. An upstream update requires a new
commit pin, license review, deterministic tests, and an entry in the
modification log below.

## Copied-file manifest

| Upstream path | LENS path | Modification |
| --- | --- | --- |
| `shared/story-identity.js` | `src/upstream/worldmonitor/story-identity.js` | Unmodified |
| `server/worldmonitor/news/v1/dedup.mjs` | `src/upstream/worldmonitor/dedup.mjs` | Import path adjusted for the LENS vendor directory |
| `server/worldmonitor/news/v1/dedup.d.mts` | `src/upstream/worldmonitor/dedup.d.mts` | Unmodified |
| `server/worldmonitor/news/v1/list-feed-digest.ts` | `src/upstream/worldmonitor/rss-parser.ts` | Extracted RSS/Atom parsing, body sniffing, strict date validation, and bounded item handling |
| `server/worldmonitor/news/v1/_classifier.ts` | `src/upstream/worldmonitor/classifier.ts` | Mapped keyword severity and categories to the ten LENS public categories |
| `src/services/geo-hub-index.ts` | `src/upstream/worldmonitor/geography.ts` | Reduced to explicit place terms and added precision labels |
| `shared/country-names.json` | `src/upstream/worldmonitor/country-names.json` | Unmodified |
| `shared/country-bboxes.json` | `src/upstream/worldmonitor/country-bboxes.json` | Unmodified |
| `shared/source-tiers.json` | `src/upstream/worldmonitor/source-tiers.json` | Unmodified |
| `shared/diplomacy-keywords.json` | `src/upstream/worldmonitor/diplomacy-keywords.json` | Unmodified |

`src/upstream/worldmonitor/story-identity.d.ts` is a LENS-authored declaration
file for the vendored JavaScript module.

## Modification log

| Date | LENS change | Upstream basis |
| --- | --- | --- |
| 2026-07-26 | Relicensed the covered LENS distribution under AGPL-3.0-only and established this provenance record. | World Monitor license and repository metadata at the pinned commit |
| 2026-07-26 | Ported story similarity, batch identity assignment, and canonical adoption; added SQLite-backed 96-hour alias support. | Files listed in the copied-file manifest |
| 2026-07-26 | Added 40 curated free feeds, bounded conditional fetching, RSS/Atom parsing, and independent SQLite feed health. | World Monitor feed catalog and list-feed digest parser at the pinned commit |
| 2026-07-26 | Added ten-category keyword classification and honest hub/country/unmapped geography. | World Monitor classifier, geo hub index, and shared country references |
| 2026-07-26 | Added attributable RSS/Open Graph images, distinct-source corroboration, deterministic representative selection, and the clamped `wm-lens-news-v1` importance score. | World Monitor source tiers, diplomacy terms, and published news-digest importance formula |

## Source offer and notices

The public LENS repository contains the complete corresponding source for the
deployed LENS service, including local modifications and build instructions.
When LENS is deployed from another revision, its visible source link must point
to that public revision or an equivalent durable source archive.

Copied files retain their upstream copyright and SPDX notices. LENS-specific
changes are documented in this manifest and remain available under
AGPL-3.0-only. Article text, images, feeds, map tiles, and other runtime data
retain their own publishers’ licenses and are not relicensed by this project.
