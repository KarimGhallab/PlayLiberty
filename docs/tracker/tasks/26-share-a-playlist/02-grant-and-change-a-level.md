# 02: Grant and change a level

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-share-list-and-a-revoke.md)

## Outcome

The share sheet gains an Add row, shown once the shares read has settled so a grant never starts from unknown
levels. Add pushes an account picker over the sheet.

The picker reads the directory page by page, fifty at a time, and keeps the route's display-name order. It appends
the next page when the list nears its end and offers a retry if that page fails. It has no search field. The
signed-in account is filtered out, because the route refuses a self-share, and every other account is present,
including accounts that already hold the playlist.

Each row carries two level controls, Can listen and Can edit, and the level an account holds is marked selected.
Pressing the other level sends exactly one grant, the upsert: a new share for an account without one, a level
change for an account with one. Pressing the held level sends nothing and closes the picker. A row disables both
controls until its answer, so the same grant cannot be sent twice. A success closes the picker and invalidates the
playlist and the library, so the sheet's list and the playlist's share mark settle. A refusal keeps the picker open
with the problem's mapped sentence beside the row, falling back to `shareDialog.grantFailed` with the account's
name.

The picker's directory read is its own query key, separate from the single-page read that resolves an owner's
display name. The new copy is `shareDialog.pickerTitle`, `shareDialog.add` and `shareDialog.noAccounts`, in both
catalogs.

## Verification

- Mobile 421 tests across 47 suites pass, including the picker's twelve cases, the page-walk unit tests, and the
  Add and grant cases at the share sheet.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass. The i18n
  suite passes 42 tests.
- On the emulator, in French, Add on Milloser's private `Chine` opened `Choisir un compte` with `Dev User` alone
  and no search field.
- `Peut écouter` sent one grant, closed the picker, and the sheet showed `Dev User`, `Peut écouter`; the database
  held `read`.
- Add again showed `Peut écouter` selected; `Peut modifier` sent one upsert and the row read `Peut modifier`, with
  `write` in the database.
- Cancel closed the picker and left the level at `write`.
- With airplane mode on, opening the picker showed the account read failure with `Réessayer`; retrying after the
  network returned loaded the rows.
- With the rows loaded and airplane mode on, `Peut écouter` kept the picker open with
  `Le partage de la playlist avec Dev User a échoué.` and both levels usable. The share was revoked afterwards,
  leaving the playlist private.

See [`26-share-a-playlist`](../../specs/26-share-a-playlist.md).
