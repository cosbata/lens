# Vendored World Monitor news identity

These files are copied or minimally adapted from
<https://github.com/koala73/worldmonitor> at commit
`d9ef780be65caf6669d352dade30fd2d777048eb`.

Copyright (C) 2024-2026 Elie Habib. Licensed under AGPL-3.0-only.

| LENS file | Upstream file | Modification |
| --- | --- | --- |
| `story-identity.js` | `shared/story-identity.js` | Unmodified |
| `dedup.mjs` | `server/worldmonitor/news/v1/dedup.mjs` | Import path adjusted for this directory |
| `dedup.d.mts` | `server/worldmonitor/news/v1/dedup.d.mts` | Unmodified |
| `story-identity.d.ts` | none | LENS TypeScript declaration for the vendored JavaScript |
| `rss-parser.ts` | `server/worldmonitor/news/v1/list-feed-digest.ts` | Extracted the dependency-free RSS/Atom parsing and strict date/body gates |
| `classifier.ts` | `server/worldmonitor/news/v1/_classifier.ts` | Mapped the keyword severity policy to LENS's ten public categories |
| `geography.ts` | `src/services/geo-hub-index.ts` and shared country references | Reduced the hub list and separated named-hub from approximate-country precision |
| `country-names.json` | `shared/country-names.json` | Unmodified |
| `country-bboxes.json` | `shared/country-bboxes.json` | Unmodified |
| `source-tiers.json` | `shared/source-tiers.json` | Unmodified |
| `diplomacy-keywords.json` | `shared/diplomacy-keywords.json` | Unmodified |
