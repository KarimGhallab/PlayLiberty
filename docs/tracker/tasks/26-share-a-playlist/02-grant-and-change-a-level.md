# 02: Grant and change a level

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-share-list-and-a-revoke.md)

## What to build

The share sheet gains an Add row that pushes an account picker over it.

The picker lists the directory the share routes read: ordered by display name, paged, appending a page as the list
reaches its end, with no search field. The owner's own account is absent. Accounts that already hold the playlist
are present like any other, with the level they hold already selected, so the same surface both grants and changes.

Each picker row carries two level controls, Can listen and Can edit. Pressing the level an account does not hold
sends exactly one grant, which is the upsert: a new share for an account without one, a level change for an account
with one. Pressing the level an account already holds sends nothing and closes the picker. A row reports busy until
its answer, so the same grant cannot be sent twice.

A success closes the picker and refreshes the shares, the playlist and the library, so the sheet's list and the
playlist's share mark settle. A refusal keeps the picker open with the problem's mapped sentence beside the row,
falling back to `shareDialog.grantFailed` with the account's name.

The share sheet's rows stay as [`01`](01-the-share-list-and-a-revoke.md) drew them, with the level as a word, so a
level change is reached through Add and there is no second switch on the row. Revoke stays the row's only
destructive control.

## Acceptance criteria

- [ ] Add pushes the picker; closing it without a choice sends nothing.
- [ ] The picker keeps the directory's name order and appends the next page when the list reaches its end.
- [ ] The picker has no search field.
- [ ] The owner's own account is absent from the picker.
- [ ] An account that already holds the playlist shows the level it holds as selected.
- [ ] Pressing a level sends exactly one grant at that level, whether the account was shared or not.
- [ ] Pressing the level already held sends nothing.
- [ ] A row is busy until its answer; the picker closes on success and refreshes the shares, the playlist and the library.
- [ ] A refusal keeps the picker open with the account's mapped sentence.
- [ ] The new copy is in the English and French catalogs together.

## Verification

The picker's own test renders a paged directory and asserts the owner is filtered out, the order is the route's, the
next page appends, there is no search field, and an existing share shows its level selected. It asserts one request
for a level press, nothing for the held level, and a refusal keeps the picker open. The share sheet's test asserts a
successful grant settles the list. The mobile suite, typecheck, lint and build pass. On the emulator in French,
grant somebody a read share, change it to write, and force a refusal with airplane mode.
