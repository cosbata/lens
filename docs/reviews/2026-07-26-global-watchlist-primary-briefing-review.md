# Review: Global watchlist and primary briefing

Feature ID: 2026-07-26-global-watchlist-primary-briefing  
Date: 2026-07-26  
Status: complete

## Summary

The map and right watchlist now support worldwide issue exploration without
changing the bottom editorial priority. The bottom band independently selects
the highest-scoring event and presents it as today’s main issue.

## Changed Files

- State boundary: `src/web/screens/TodayOverview.tsx`
- Single-primary presentation: `src/web/components/BriefingBand.tsx`
- Watchlist labels: `src/web/components/MonitorPanel.tsx`,
  `src/web/components/MonitorControls.tsx`
- Regression coverage: `tests/web/today-map.test.tsx`,
  `tests/web/briefing-band.test.tsx`, `tests/e2e/accessibility.spec.ts`
- Portfolio explanation: `docs/case-study.md`

## Validation Evidence

```text
npm test -- tests/web/today-map.test.tsx tests/web/briefing-band.test.tsx
npm run typecheck
npm run lint
npm run test:e2e -- --grep "monitor"
```

- Six targeted component tests passed.
- TypeScript and unused-symbol lint passed.
- The monitor browser regression passed.
- Manual browser inspection confirmed a security event on the right while the
  earthquake remained the bottom main issue.

## Scope Drift Check

- No provider, ranking weight, database, or deployment behavior changed.
- The existing score, event collection, components, and local state were reused.
- No dependency or new abstraction was added.

## Risks / Failures

- “Worldwide issues” remains the curated attributable collection, not every raw
  headline or unverified signal.
- Local provider failure still uses the clearly identifiable fixture fallback.

## Next Step

Increase provider breadth within the existing ten curated categories, then add
map clustering only if real event density produces marker overlap.
