# 01: The share list and a revoke

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Outcome

The Share item now opens a share sheet from both surfaces: the detail's actions sheet and a gallery card's actions
sheet, which behave the same. The placeholder keeps Cover alone; Share left it on both screens.

The sheet reads the playlist's shares only while it is open, through its own read and its own revoke write. A row
carries the account's monogram or avatar, its display name, its level as a word and Revoke. The read has three
bodies: `shareDialog.loading` while it is in flight, `shareDialog.private` when nobody else holds the playlist, and
the read-failure body with a retry.

Revoke asks once, in the row, and the question replaces the control. Cancel sends nothing. Confirming sends one
request and the row stays disabled until the answer. A success invalidates the playlist and the library, so the
shares list, the playlist's share mark and the gallery settle together. A refusal keeps the sheet and the row, with
the problem's mapped sentence when the server sent one and `shareDialog.revokeFailed` with the account's name
otherwise.

The sheet is reachable only where the actions sheet is: a writer and a reader have no Share item. The server's
routes remain the second line.

The account avatar now accepts the directory's narrow summary, so the sheet draws another account's face without
carrying an email address or a role. The new copy is `shareDialog.private`, `shareDialog.revoke`,
`shareDialog.revokeAsk` and `shareDialog.remove`, in both catalogs.

The revoke control drops `busy` from its accessibility state and keeps `disabled`, because Android rewrote the
control's accessible name to "busy" after a refusal.

## Verification

- Mobile 403 tests across 45 suites pass, including the share sheet's nine cases and the detail and gallery entry
  cases. The i18n suite passes 42 tests.
- `pnpm --filter @playliberty/mobile run typecheck`, `pnpm run lint:check` and `pnpm run build` pass.
- On the emulator, in French, a share from Milloser's `Chine` to `Dev User` read `Dev User`, `Peut écouter`,
  `Retirer`, and the row's accessible name read `Dev User, Peut écouter`.
- `Retirer` asked once with `Retirer l'accès à cette playlist ?`; `Annuler` left the share in place. Confirming
  removed the row, showed `Personne d'autre ne peut voir cette playlist. Elle est privée.`, and deleted the row in
  the database.
- Airplane mode forced a refused revoke; the sheet and the row stayed, the row stayed usable, and the sentence read
  `Le retrait du partage de la playlist avec Dev User a échoué.` The share was revoked afterwards, leaving the
  playlist private.
- A gallery card's Share opened the same sheet with the same private body, and the card's share mark returned to
  private.

See [`26-share-a-playlist`](../../specs/26-share-a-playlist.md).
