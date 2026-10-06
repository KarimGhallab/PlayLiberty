# 03: The library cannot recover from a failed read

**State:** `needs-triage`
**Category:** `bug`

## Observed

When `GET /playlists` fails, the library draws one sentence and stops. This is the whole failed-read
state:

```tsx
/* LibraryPage.tsx:116-120 */
{
  playlists.isError ? (
    <p className={styles.library__note} role="alert">
      Playlists could not be loaded.
    </p>
  ) : null;
}
```

There is no retry, no server `detail`, and no distinction between a transient blip and a broken instance.
The header and the add control remain, so the dialog is still reachable, but the list itself is a dead end.

## Expected

A recoverable read failure offers a way back: a "Try again" that refetches, and the server's `detail` when
the error is an `ApiError`, so a transient fault is distinguishable from a broken instance. This is the one
state where the whole product is unreachable, so it must carry the strongest recovery, not the weakest.

## Related: a failed sync says nothing reassuring on the library

The same screen draws a failed playlist as a red word and a red hairline and nothing else. The
reassurance ("your tracks are safe") lives only on the detail screen's `sync-error` band. Issue
[`01-silent-failures-and-live-sync-progress`](01-silent-failures-and-live-sync-progress.md) decided the
split (the library says `Sync failed` and links; the detail carries the words), so this is not a silent
duplicate. The critique questions that split for the case where the library is the only screen a household
scans: red with no explanation reads as data loss, and the reassurance is exactly the fact the product
promises. Triage should either confirm 01's split or move a short reassurance onto the row's sync line.

## Evidence

- `LibraryPage.tsx:116-120` is the whole failed-read state.
- [`01-silent-failures-and-live-sync-progress.md`](01-silent-failures-and-live-sync-progress.md) Q3 owns
  the library/detail split for sync failure.
- Critique run `views-library-librarypage-librarypage-tsx-a51b86be`, Priority Issues P1 (failed read) and
  P2 (failed-sync reassurance).
