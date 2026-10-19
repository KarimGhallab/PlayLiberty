# 85: The sync band mixes two measurements

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** The band presents the last run's retained, added and removed counts beside the live failed count, with no wording that names either, three zero cells on a healthy playlist, and a stamp that runs two sentences together.

**Current behavior:**
`SyncSummary` draws `run.retainedCount`, `run.addedCount`, `run.removedCount` and the passed `failedCount`, which the detail computes from the live track statuses. Zero cells are muted but still drawn. `syncSummary.lastSync` is `'Derniere synchronisation {time}'` and the time is `'Il y a 3 jours'`, so the sentence reads "Derniere synchronisation Il y a 3 jours". `26 ajoutees` reads as a lifetime total on a playlist of 26 tracks.

**Desired behavior:**
The band names the measurement it reports (this run) and either hides its zero cells or states the run's frame; the stamp is one sentence.

**Key interfaces:**

- The four cells and their tones stay; issue 68 settled the failed count's source.
- The i18n string owns the wording.

**Acceptance criteria:**

- [ ] A reader can tell what the four figures describe.
- [ ] A healthy playlist does not read as four zeroes.
- [ ] The stamp is grammatical in both languages.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The run's own model and the worker.

## Observed

- Band: `0 conservee / 26 ajoutees / 0 retiree / 3 echouees` with `Derniere synchronisation Il y a 3 jours` under it.

## Expected

- The band and the stamp say what they measure, once.

## Evidence

- `apps/web/src/shared/components/SyncSummary/SyncSummary.tsx:34-70`.
- `packages/i18n/src/fr.ts:289` (`lastSync`), `packages/i18n/src/fr.ts:218-239` (relative time).
- Impeccable critique of `apps/web`, 2026-10-19, minor observations.
