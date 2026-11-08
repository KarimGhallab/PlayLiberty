# 02: Grant and change a level

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

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

See [`26-share-a-playlist`](../../specs/26-share-a-playlist.md).
