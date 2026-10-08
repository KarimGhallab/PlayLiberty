# 03: The library cannot recover from a failed read

**State:** resolved
**Category:** `bug`

## Agent Brief

**Category:** bug
**Summary:** A blocking read failure is a dead end. It draws one sentence, offers no retry, and drops
the server's `detail`. The library's read is the named instance; the same dead end exists on the detail's
tracks read and on the share dialog's read.

**Current behavior:**
When a blocking read fails, the surface replaces its content with a single `role="alert"` sentence and
stops. There is no control to try again, and the `ApiError` the read threw is discarded, so the server's
`problem.detail` never reaches the screen. On the library this is the state where the whole product is
unreachable; the detail's tracks read and the share dialog's read fail in exactly the same way.

**Desired behavior:**
Every blocking read failure offers a way back. It renders the server's `detail` when the error is an
`ApiError` that carries one, falling back to the existing sentence otherwise, and it renders one labelled
retry that refetches the read that failed. On success the retry replaces the failure with the real content:
the populated list or the empty gallery on the library, the track list on the detail, the dialog's body on
the share dialog. The retry refetches only the failed read and never reloads the page. It is a real button,
reachable and operable by keyboard, and named so a screen reader announces it.

**Key interfaces:**

- The read hooks already expose `refetch` and `error`; use them and add no query.
- `ApiError` carries a nullable `problem.detail` and a `problem.code`; the recovery surface maps the code to a
  catalog sentence and falls back to the server's `detail`, then to its own sentence, when the error is not an
  `ApiError` or nothing maps.
- The share dialog's failure can come from either of two reads; its retry refetches both.

**Acceptance criteria:**

- [x] The library's failed read renders the retry and, when the error is an `ApiError` with a detail, that
      detail; pressing the retry refetches the playlists read and renders the populated list or the empty
      gallery on success.
- [x] The detail's failed tracks read does the same for the tracks read and renders the track list on
      success.
- [x] The share dialog's failed read does the same for its reads and renders the dialog's body on success.
- [x] A non-`ApiError` failure, or an `ApiError` with no detail, shows the existing sentence.
- [x] The retry is a labelled button, reachable and operable by keyboard.
- [x] Each surface has a test covering the failed read, the detail, and the recovered state after the retry;
      the existing failed-read tests keep passing.
- [x] The library design record's state list covers the failed-read state, as it already covers loading,
      empty and signed-out.
- [x] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The failed-sync reassurance on the library row. Issue 01's split is confirmed: the row keeps `Sync failed`
  plus its link and the detail keeps the reassurance.
- Automatic retry, backoff or polling. The recovery is one manual press.
- Localization. The new copy stays plain English like the surrounding code; wiring it into the catalog
  belongs to spec 11.
- Making `Sync now` more discoverable, which the critique raises alongside the reassurance and which issue
  01's split does not own.

## Outcome

Done. A blocking read failure now offers a way back, on all three surfaces.

- A new `ReadFailure` component draws the server's `detail` when the error is an `ApiError` that carries one,
  the fallback sentence otherwise, and one secondary **Try again** that refetches the read that failed and
  locks while it works. It is a real button, named by its own word.
- The library, the playlist detail's tracks read and the share dialog all draw it; the dialog's retry
  refetches both of its reads.
- Tests: the component (the detail, the fallback, the retry, the locked state), the library (the detail, the
  fallback, the recovery), the detail (the detail, the recovery) and the share dialog (the detail, the
  recovery).
- Records: [`library.md`](../../design-system/screens/library.md) now has a "The failed read offers a way
  back" state beside loading, empty and signed-out. The library's now-unused `&__note` style was removed.

Verification: `pnpm run build`, `pnpm run lint`, the web unit suite (328 tests), the full unit suite, the e2e
suite (27 tests) and `node docs/design/scripts/validate-design-tokens.cjs` all pass. Not committed.

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
