# Share a playlist

Status: resolved
Labels: `enhancement`

## Problem Statement

Sharing is promised, designed, and absent. A playlist carries an owner and can be handed to another account on
the same instance, the web client has a share dialog, and the playlist it reads already carries the access
level and whether it has any shares. None of it can happen: `GET /playlists/:id/shares`,
`POST /playlists/:id/shares` and `DELETE /playlists/:id/shares/:accountId` all answer `501`, and so does
`GET /accounts`, the route that lists the accounts a playlist could be shared with, so there is nothing to even
name in a dialog.

The second problem is who may see whom. A share needs a target, and the target list is a list of people. The
instance is private and sits behind the edge, which makes it a household rather than a public service, and the
account record as it stands carries an email address and a role. Exposing those to every other account in order
to render a picker is more than the picker needs, and it is the kind of decision that is cheap to make now and
expensive to unpick once every client has read it.

## Solution

An owner lists the accounts on the instance, grants one of them access to one of their playlists at either
level, and revokes it again. A read share lets that account see the playlist, find it in the library and play
what is in it. A write share adds the right to add, remove and sync. Rename, delete and share management never
leave the owner. Revocation takes effect on the next request, and a playlist the account can no longer reach
answers exactly as a playlist that never existed.

## Implementation Decisions

- **The three share routes are the three that are already stubbed**, under the playlist, and the listing route
  returns the share schema the contracts already define, carrying the account, the level, and when the share
  was created. No contract change there, which is the second time the contracts have anticipated a feature that
  was never built.
- **The account directory is the route that already stubs `GET /accounts`,** and it returns the narrowest view a
  picker needs: an account's id, display name and avatar, never their email address and never their role. The
  wider account view already exists and stays where it belongs, on `GET /me`. _Decided here:_ this adds one
  small schema to the contracts, and the alternative, reusing the wider view, would hand every account in the
  household every other account's email address for no reason.
- **The directory is available to any authenticated account**, because any account may be handed a share and
  any owner needs a list to choose from. It is not admin-only, and there is no admin surface in v1.
- **The directory is paged with the existing page query and ordered by display name,** because a picker is read
  in order and a list ordered by creation is a list ordered by who happened to sign in first.
- **The directory has no search field.** The instance is a small group of accounts by definition, so the list
  is short enough to scan, and search over accounts would be the thin edge of the content search that is a
  permanent non-goal. If an instance ever holds enough accounts for that to stop being true, the answer is a
  filter on the list, not a search engine.
- **Every share route is owner-only.** A collaborator cannot share, at either level, and a read collaborator
  cannot do anything at all. The reason is structural rather than a policy choice: a share is a grant of
  access, and an account that can grant access is an owner by definition, so a write collaborator allowed to
  share would be a second owner wearing a collaborator's label.
- **Granting is an upsert.** Posting a share for an account that already has one changes its level rather than
  failing or creating a second row, and the unique constraint on playlist and account is what makes that well
  defined. The alternative, refusing and making the owner revoke and re-grant, is two actions for one change of
  mind and needs a route this surface does not have.
- **There are two levels and no third.** The level is the share-level enum's own two members, and the server
  decides what each one means with an exhaustive switch, so adding a level fails the build there rather than
  passing through as a string nobody has given meaning to. The playlist's access value is the owner or one of
  the two levels, and that union has no fourth member on purpose: a playlist an account cannot see is a `404`,
  so there is no "no access" value for a client to carry, and adding one later would reopen a question two
  routes have already answered.
- **The owner cannot share with themselves.** A share to the account that owns the playlist would be a second
  path to access the owner already has, and every rule about who may do what would then have to consider it. It
  is refused rather than ignored.
- **A share target that does not exist is a `404`,** and a playlist that is not the caller's, or does not exist,
  is the same `404` every other route in this set returns. The caller's own playlist existing or not is not
  something a share attempt reveals.
- **A read share grants the library, the playlist, its tracks, the stream and the thumbnails, and nothing that
  changes anything.** The library shows the playlist with read access, the detail screen shows one item in its
  overflow menu, and every mutating route in [`04-curate-a-playlist`](04-curate-a-playlist.md) answers a
  refusal.
- **A write share grants adding, removing, retrying and syncing, and nothing else.** Rename, delete and share
  management stay with the owner. This is the glossary's definition of a collaborator and it is enforced on the
  server, with the interface's absence of a control following from it.
- **A collaborator's addition is an ordinary association.** Nothing marks it as a collaborator's, so the
  playlist does not carry two kinds of track and a later sync treats both the same way.
- **Sharing changes no media, no count, and no sync state.** Two accounts holding one track share one file,
  because the media store is instance-wide and deduplicated by video id. A share is a permission, not a copy.
- **Revocation takes effect for every request that begins after it,** which is what deleting the share row
  means. A range response already in flight is not interrupted, because cutting a stream mid-file leaves a
  player with a half buffer and no way to recover. _Decided here:_ the alternative, tracking live responses, is
  machinery for a case that resolves itself in seconds.
- **Deleting a playlist ends its shares** through the same cascade that removes its associations, so no share
  can outlive the playlist it points at.
- **There is no invitation, no notification, and no link.** A share names an account that already exists on the
  instance, so there is nothing to send and nothing to deliver, and there is no path by which a playlist can be
  reached from outside it. The private boundary is structural: the only way in is an account, and the only way
  to have an account is to pass the edge.
- **The library names the owner of a shared playlist, and this is where the name comes from.** The library
  wanted a "shared by" line and had no route to supply a display name. The directory does, and the web
  client resolves `ownerAccountId` through it for the items that are not its own. _Decided here:_ the
  alternative, showing only the share indicator, was the state before the directory existed, and this spec
  is what makes the line affordable. [`08-see-the-library`](08-see-the-library.md) owns how the line is drawn.
- **Inherited constraints are owned by the architecture and not restated here:** the private deployment with no access from outside the instance ([Deployment behind the Pangolin edge](../../ARCHITECTURE.md#deployment-behind-the-pangolin-edge)), identity from the forwarded edge headers and fail-closed ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the client header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- Inviting anybody who does not already have an account, by email, by link, or by any other route.
- Public links, unauthenticated access, and anything that would let a playlist leave the instance.
- Groups, teams, and sharing with more than one account at a time. The product is a household.
- Sharing individual tracks, and sharing anything other than a playlist.
- An access level beyond read and write, including anything resembling an editor, a manager, or a per-track
  override.
- Revoking every share at once, and transferring ownership of a playlist to another account.
- Any notification that a playlist has been shared, in any direction.
- The controls that make sharing usable, which are the share dialog and the overflow menu, cut as their own
  tickets.
