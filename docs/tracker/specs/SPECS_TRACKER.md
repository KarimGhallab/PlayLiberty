# Specs

Feature specs, written by `/to-spec`. One file per spec, named `NN-slug.md` and numbered in creation order.

## Specs

| Spec                                              | Decides                                                         |
| ------------------------------------------------- | --------------------------------------------------------------- |
| [`01-sync-a-playlist`](01-sync-a-playlist.md)     | Mirroring a source, reconciling it, and never deleting a track  |
| [`02-store-a-track`](02-store-a-track.md)         | The download lifecycle that turns a pending track into audio    |
| [`03-read-a-playlist`](03-read-a-playlist.md)     | The route a client needs to see a playlist's tracks             |
| [`04-curate-a-playlist`](04-curate-a-playlist.md) | Rename, delete, add to several playlists at once, remove, retry |
| [`05-share-a-playlist`](05-share-a-playlist.md)   | Sharing a playlist, and the account directory to share with     |
| [`06-prune-orphans`](06-prune-orphans.md)         | Reclaiming media nothing references any more                    |
| [`07-play-stored-audio`](07-play-stored-audio.md) | The player, the queue, and playing stored media                 |

## Coverage

The remaining work, and which spec decides it. Every route that answers `501` and the one route that does not
exist are listed, so a spec that leaves a row uncovered is a gap in the specs rather than a surprise during a
ticket.

### Routes

| Route                                     | State today    | Spec                                                 |
| ----------------------------------------- | -------------- | ---------------------------------------------------- |
| `GET /accounts`                           | `501`          | [`05`](05-share-a-playlist.md)                       |
| `POST /playlists`                         | `501`          | [`01`](01-sync-a-playlist.md)                        |
| `PATCH /playlists/:id`                    | `501`          | [`04`](04-curate-a-playlist.md)                      |
| `DELETE /playlists/:id`                   | `501`          | [`04`](04-curate-a-playlist.md)                      |
| `POST /playlists/:id/sync`                | `501`          | [`01`](01-sync-a-playlist.md)                        |
| `POST /playlists/:id/tracks`              | `501`          | [`04`](04-curate-a-playlist.md), replaced by a batch |
| `DELETE /playlists/:id/tracks/:trackId`   | `501`          | [`04`](04-curate-a-playlist.md)                      |
| `GET /playlists/:id/shares`               | `501`          | [`05`](05-share-a-playlist.md)                       |
| `POST /playlists/:id/shares`              | `501`          | [`05`](05-share-a-playlist.md)                       |
| `DELETE /playlists/:id/shares/:accountId` | `501`          | [`05`](05-share-a-playlist.md)                       |
| `POST /tracks/:id/retry`                  | `501`          | [`04`](04-curate-a-playlist.md)                      |
| `GET /playlists/:id/tracks`               | does not exist | [`03`](03-read-a-playlist.md)                        |
| `POST /tracks`                            | does not exist | [`04`](04-curate-a-playlist.md), the batch add       |

The batch add replaces the nested add rather than filling it, because a path under one playlist cannot
express a choice of several. That is the one route decision in these specs that changes a decision recorded
elsewhere, and it wants an ADR when its ticket is cut.

### Everything else

| Work                                              | Spec                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| The reconcile: add, keep, retain, suppress        | [`01`](01-sync-a-playlist.md)                                            |
| A failed sync changing nothing                    | [`01`](01-sync-a-playlist.md)                                            |
| The download worker's claim and state transitions | [`02`](02-store-a-track.md)                                              |
| Thumbnail fetching                                | [`02`](02-store-a-track.md)                                              |
| Writing suppressions                              | [`04`](04-curate-a-playlist.md)                                          |
| The orphan prune                                  | [`06`](06-prune-orphans.md)                                              |
| The player, the queue, and the queue's surface    | [`07`](07-play-stored-audio.md)                                          |
| The mobile access flow                            | settled by ADR 0008, carried by `07-provision-mobile-access`             |
| The design foundation                             | settled by ADR 0009, carried by `10-build-design-foundation`             |
| The web and mobile clients                        | consume the above, carried by `05-scaffold-web` and `06-scaffold-mobile` |
| A real seek, and playback surviving a screen lock | verification of [`07`](07-play-stored-audio.md), in an end-to-end ticket |

## Conventions

- A spec states the problem, the agreed behaviour, and the constraints that bound the solution. It is not a plan and not a task list.
- Specs are the source a set of tickets is cut from, so they must be decidable: a reader should be able to say whether a given implementation satisfies them.
- Once implemented, the spec stays as the record of what was agreed. Do not rewrite it to match what shipped; write an ADR for a decision that changed.
- **A decision the repository has not already made is marked `Decided here`** in the spec's implementation
  decisions, so a reader can tell at a glance which decisions are the spec's own and overturn any of them
  before its tickets are cut. A decision that follows from the product, architecture, glossary, design records
  or an existing ADR is stated without the mark, and names what settles it.
- One spec is one user-visible verb. A spec that had to be split by layer would be a plan, and a plan belongs
  in a ticket set.
- A client's behaviour is specified once, in client-neutral terms, with a clause for what differs between the
  two runtimes. Two specs for one behaviour would drift, which is the failure the shared contracts and the
  shared formatting helpers already exist to prevent.
