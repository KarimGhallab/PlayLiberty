# 09: The sync band

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-detail-reads-a-playlist.md)

## Outcome

The sync band sits under the identity and above the controls. Its summary draws the latest run's kept, added and
removed counts, the live failed count, the relative last-sync stamp, and, while a run is active, the downloading
line. Zero cells are hidden. A finished run with no counts says Nothing changed. A running run's stamp steps aside
when the identity above already says Syncing, as the web's rule does.

A failed sync replaces the summary. The band names the provider, reassures with the whole playlist's track count,
puts the server's raw error behind Show details as-is, and gives a writer a Sync retry that reports its wait. The
summary gives a writer Retry failed when failed tracks exist, with the failed set's count in the label and the
in-flight state while it runs. A read collaborator sees the counts, the reassurance and the raw error without either
retry.

`useRetryFailedTracks` reads the failed page set and retries each track, then asks the playlist reads again. All band
copy was already in both catalogs.

## Verification

- Sync band 9 tests, detail 70 tests; mobile 279 tests across 35 suites.
- `pnpm --filter @playliberty/mobile run typecheck` passes.
- `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, the shared Chine detail drew the band under the identity with `Last sync 14 hours ago` and
  `Nothing changed`. The failed-run and retry paths are covered by the band's widget tests because the dev data has no
  failed run or failed track.

See [`22-read-a-playlist`](../../specs/22-read-a-playlist.md).
