# Share a playlist

Status: ready
Labels: `enhancement`, `ready-for-agent`

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

## User Stories

1. As a playlist owner, I want to share a playlist with someone in my household, so that they can listen to
   what I listen to.
2. As a playlist owner, I want to choose read or write, so that I decide what the share is for.
3. As a playlist owner, I want to see who a playlist is shared with, so that I know who has it.
4. As a playlist owner, I want to change a share's level, so that I can widen or narrow it without starting
   over.
5. As a playlist owner, I want to revoke a share, so that someone no longer has it.
6. As a playlist owner, I want a revoked share to take effect at once, so that it is not a request away.
7. As a playlist owner, I want to see that a playlist is shared without opening the dialog, so that I know it
   is not only mine.
8. As a playlist owner, I want to be able to share with any account on the instance, so that I am not limited
   to people I have shared with before.
9. As a playlist owner, I want to be prevented from sharing a playlist with myself, so that there is one access
   path to it rather than two.
10. As a playlist owner, I want a share to survive a sync, so that sharing is not something I have to redo.
11. As a playlist owner, I want sharing a playlist not to copy any audio, so that a shared song is one file on
    the instance.
12. As a playlist owner, I want deleting a playlist to end its shares, so that nothing is left pointing at
    nothing.
13. As a read collaborator, I want the playlist to appear in my library, so that a share is usable rather than
    a message.
14. As a read collaborator, I want to play the tracks in it, so that the share is worth having.
15. As a read collaborator, I want the playlist to be marked as shared with me and not mine, so that I do not
    rename or delete something that is not mine.
16. As a read collaborator, I want every changing action refused, so that the playlist stays as its owner left
    it.
17. As a write collaborator, I want to add a track, so that I can help build the playlist.
18. As a write collaborator, I want to remove a track, so that I can keep it relevant.
19. As a write collaborator, I want to sync it, so that it stays current without asking the owner.
20. As a write collaborator, I want renaming, deleting and share management to be absent rather than refused,
    so that the interface does not tease me with what is not mine.
21. As a write collaborator, I want my additions to be the same kind of addition as the owner's, so that the
    playlist does not have two kinds of track.
22. As an account, I want a playlist I have lost access to to read as gone rather than as forbidden, so that a
    revoked share is not a fault I have to report.
23. As an account, I want to see other people's display names, so that I can recognise them in a picker.
24. As an account, I want not to see other people's email addresses, so that the picker does not cost anyone
    their address.
25. As an account, I want not to see other people's roles, so that who administers the instance is not my
    business.
26. As an account, I want to see myself in the same shape as everyone else, so that the picker treats me
    consistently.
27. As an account, I want a share aimed at an account that does not exist to be refused, so that a mistyped
    choice is not silently lost.
28. As an operator, I want the instance to have no way to share outside itself, so that the private boundary
    holds by construction rather than by policy.

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
  record wanted a "shared by" line and had no route to supply a display name. The directory does, and the web
  client resolves `ownerAccountId` through it for the items that are not its own. _Decided here:_ the
  alternative, showing only the share indicator, is the state the design record was written in, and this spec
  is what makes the line affordable. [`08-see-the-library`](08-see-the-library.md) owns how the line is drawn.
- **Inherited constraints are owned by the ADRs and not restated here:** the private deployment with no access from outside the instance ([`0001`](../../adr/0001-private-deployment-behind-pangolin-edge.md)), identity from the forwarded edge headers and fail-closed ([`0003`](../../adr/0003-identity-via-pangolin-forwarded-headers.md)), and the client header with the origin check ([`0006`](../../adr/0006-csrf-defense.md)).

## Testing Decisions

- **One seam, at the highest point available.** The real app over a temporary database, exercised through HTTP
  injection, with accounts and playlists seeded directly. Nothing in this spec needs the media root or the
  adapter, so neither is involved beyond the shared test context.
- **What makes a good test here** is the access a caller ends up with, observed through the routes that depend
  on it, rather than the shape of the share row. A test that asserts a row exists is a test of the
  implementation; one that asserts a write collaborator's rename is refused and a read collaborator's stream
  succeeds is a test of the feature.
- **The cases that must exist:**
  - an owner lists a playlist's shares and sees the account, the level, and the time;
  - an owner grants read and the target immediately sees the playlist in its library with read access;
  - granting write over read changes the level on the same account and produces one share, not two;
  - granting to yourself is refused;
  - granting to an account that does not exist is refused;
  - a read collaborator may read the playlist, its tracks, the stream and the thumbnail, and is refused by
    every mutating route;
  - a write collaborator may add, remove, retry and sync, and is refused rename, delete and all three share
    routes;
  - a non-collaborator is refused by the share routes and answers `404` for the playlist itself;
  - the directory returns every account with a display name and an avatar, and no email address and no role
    anywhere in the payload;
  - the directory is ordered by display name and paged;
  - revoking removes access immediately: the next read of the playlist, the next stream and the next library
    listing all stop finding it, and the answer is the same `404` as a playlist that never existed;
  - sharing does not create a second track, a second association count change, or a second stored file;
  - deleting the playlist removes its shares;
  - a share survives a sync of the playlist.
- **Prior art:** the existing server route tests, which build the real app over a temporary database, seed
  accounts directly and validate responses against the contract schemas. The access rule the share routes
  enforce is already implemented in the playlist listing, the playlist read and the stream route, and those are
  the prior art for the `404` answer and for what counts as access.

## Out of Scope

- Inviting anybody who does not already have an account, by email, by link, or by any other route.
- Public links, unauthenticated access, and anything that would let a playlist leave the instance.
- Groups, teams, and sharing with more than one account at a time. The product is a household.
- Sharing individual tracks, and sharing anything other than a playlist.
- An access level beyond read and write, including anything resembling an editor, a manager, or a per-track
  override.
- Revoking every share at once, and transferring ownership of a playlist to another account.
- Any notification that a playlist has been shared, in any direction.
- The controls that make sharing usable, which are the share dialog and the overflow menu, specified in the
  design records and cut as their own tickets.
