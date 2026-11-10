# 07: The card's actions

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The card's scrim now carries an overflow control at its bottom-left, named "More actions for {name}". It opens one `PlaylistActionsSheet` for the pressed playlist, on the shared `Sheet` frame. The shared actions model gates the items by access: an owner sees Pin or Unpin, Share, Rename, Cover, Sync now and Delete; a write collaborator sees Pin or Unpin, Cover and Sync now; a reader sees Pin or Unpin. The pin's label follows the state.

Pin is optimistic through `useUpdatePin`: the pin patch lands on the cached library page, so the card regroups on the press. A refusal restores the previous page and the gallery shows `library.pinFailed` on the notice. A success invalidates the library.

Delete leaves the gallery immediately. The delete intent carries the playlist name, a six-second window opens, and `UndoSnackbar` offers Undo. Undo restores the card and sends nothing; the commit sends the delete and invalidates the library. A failed commit restores the card and shows `library.deleteFailed`. A second delete sends the first one immediately rather than losing it.

Share, Rename and Cover open `PlaylistPlaceholderSheet`, which names the action and says the surface arrives later; specs `26`, `25` and `29` replace those bodies.

The actions model's tests cover the item sets, the pin label, the optimistic pin patch and the delete intent. The card's tests cover the overflow control; the gallery's tests cover opening the sheet, the reader's item set, the pin and its refusal notice, the delete and Undo, and the three placeholders.

See [`21-see-the-library`](../../specs/21-see-the-library.md).
