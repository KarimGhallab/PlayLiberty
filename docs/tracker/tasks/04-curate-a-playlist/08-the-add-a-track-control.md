# The add-a-track control

**Objective:** Put the control that opens the add-a-track dialog in the top-right of the playlist detail,
present for the owner and a `write` collaborator and absent for a `read` one, mirroring the library's own add
button.

**Blocked by:** None.

**Scope**

- `PlaylistDetailPage` reads the library (`usePlaylists`) and derives the writable playlists: `owner` or
  `write`, never `read`, because a playlist the account cannot write to is absent rather than disabled.
- The way-home row becomes `space-between` and holds the control: the same accent pill, the same `plus`, the
  label "Add a track". It is absent for a `read` collaborator, the screen's rule for every control it does not
  offer a refusal through.
- The design records: [`playlist-detail.md`](../../../design-system/screens/playlist-detail.md) gains the control
  in its access table and its own paragraph; the control is outside the overflow because adding a track is the
  one curating action every writable account has and the most frequent thing done on the screen.

**Outcome**

Landed. The control is in the way-home row for the owner and a `write` collaborator and absent for a `read`
one, asserted in `PlaylistDetailPage.test.tsx`. Its label is "Add a track" for the glossary's reason: a track
is what the server stores and a video is its source, so the control is named for the track while the dialog's
field takes a video URL.

**Verification**

- `PlaylistDetailPage.test.tsx`: the owner sees the control and it opens the dialog; a read collaborator sees
  neither the overflow nor the control.
- `pnpm run build`, `pnpm run lint`, `pnpm run design:check` and the web suite pass.
