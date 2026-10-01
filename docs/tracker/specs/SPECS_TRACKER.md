# Specs

Feature specs, written by `/to-spec`. One file per spec, named `NN-slug.md` and numbered in creation order.

This corpus is the web and server MVP. Every client clause is the web client. Mobile, the provisioning flow
and ADR 0008 are out of scope, and no spec in this set is written to leave room for them.

## Specs

| Spec                                                            | State  | Blocked by                                                                                                                    | Blocks                                                                                                                                                                                           |
| --------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`01-sync-a-playlist`](01-sync-a-playlist.md)                   | agreed | none                                                                                                                          | [`02`](02-store-a-track.md), [`04`](04-curate-a-playlist.md), [`05`](05-share-a-playlist.md), [`06`](06-prune-orphans.md), [`08`](08-see-the-library.md), [`09`](09-keep-the-screens-current.md) |
| [`02-store-a-track`](02-store-a-track.md)                       | agreed | [`01`](01-sync-a-playlist.md)                                                                                                 | [`06`](06-prune-orphans.md), [`07`](07-play-stored-audio.md)                                                                                                                                     |
| [`03-read-a-playlist`](03-read-a-playlist.md)                   | agreed | none                                                                                                                          | [`07`](07-play-stored-audio.md), [`08`](08-see-the-library.md), [`09`](09-keep-the-screens-current.md)                                                                                           |
| [`04-curate-a-playlist`](04-curate-a-playlist.md)               | agreed | [`01`](01-sync-a-playlist.md)                                                                                                 | [`09`](09-keep-the-screens-current.md)                                                                                                                                                           |
| [`05-share-a-playlist`](05-share-a-playlist.md)                 | agreed | [`01`](01-sync-a-playlist.md)                                                                                                 | [`07`](07-play-stored-audio.md), [`08`](08-see-the-library.md), [`09`](09-keep-the-screens-current.md)                                                                                           |
| [`06-prune-orphans`](06-prune-orphans.md)                       | agreed | [`01`](01-sync-a-playlist.md), [`02`](02-store-a-track.md)                                                                    | none                                                                                                                                                                                             |
| [`07-play-stored-audio`](07-play-stored-audio.md)               | agreed | [`02`](02-store-a-track.md), [`03`](03-read-a-playlist.md), [`05`](05-share-a-playlist.md)                                    | none                                                                                                                                                                                             |
| [`08-see-the-library`](08-see-the-library.md)                   | agreed | [`01`](01-sync-a-playlist.md), [`03`](03-read-a-playlist.md), [`05`](05-share-a-playlist.md)                                  | none                                                                                                                                                                                             |
| [`09-keep-the-screens-current`](09-keep-the-screens-current.md) | agreed | [`01`](01-sync-a-playlist.md), [`03`](03-read-a-playlist.md), [`04`](04-curate-a-playlist.md), [`05`](05-share-a-playlist.md) | none                                                                                                                                                                                             |

## Conventions

- One file per spec, named `NN-slug.md`, numbered in creation order.
- The table above links every spec reference to its file, so a reader lands on the spec from any row.
- One spec is one user-visible verb. A spec that had to be split by layer would be a plan, and a plan belongs
  in a ticket set.
- A spec is **agreed** when its decisions are settled and tickets can be cut from it. A spec replaced by a
  later one is marked **superseded** rather than deleted, so the decision it recorded stays readable.
- Each spec declares its blocking edges: the specs whose decisions its implementation depends on. A spec with
  no edges can be cut immediately.
- Blocking edges order the cut, not the code. A spec blocked by another is one whose tickets would otherwise
  invent a decision the other spec owns.
- A decision the repository has not already made is marked `Decided here` in the spec's implementation
  decisions, so a reader can tell at a glance which decisions are the spec's own and overturn any of them
  before its tickets are cut.
- Because this corpus is web only, a client clause names the web client rather than the two runtimes. The
  token layer and the shared UI decisions are still client-neutral; the behavior is not.

## Coverage

Every route that is not implemented, and the spec that decides it. A route that answers `501` today, or that
does not exist, is listed so a spec that leaves one uncovered is a gap rather than a surprise during a ticket.

### Routes

| Route                                        | State today    | Spec                                                                          |
| -------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| `GET /healthz`, `GET /readyz`                | implemented    | scaffold, `04-scaffold-server`                                                |
| `GET /api/v1/me`                             | implemented    | scaffold, identity from the edge                                              |
| `GET /api/v1/playlists`                      | implemented    | [`08`](08-see-the-library.md), the library reads it                           |
| `GET /api/v1/playlists/:id`                  | implemented    | [`03`](03-read-a-playlist.md), the detail reads it                            |
| `GET /api/v1/playlists/:id/sync-runs/latest` | implemented    | [`01`](01-sync-a-playlist.md), the client's only outcome route                |
| `GET /api/v1/tracks/:id/stream`              | implemented    | [`07`](07-play-stored-audio.md), authorised by [`05`](05-share-a-playlist.md) |
| `GET /api/v1/tracks/:id/thumbnail`           | implemented    | [`02`](02-store-a-track.md), fetched with the audio                           |
| `POST /playlists`                            | `501`          | [`01`](01-sync-a-playlist.md)                                                 |
| `POST /playlists/:id/sync`                   | `501`          | [`01`](01-sync-a-playlist.md)                                                 |
| `PATCH /playlists/:id`                       | `501`          | [`04`](04-curate-a-playlist.md)                                               |
| `DELETE /playlists/:id`                      | `501`          | [`04`](04-curate-a-playlist.md)                                               |
| `DELETE /playlists/:id/tracks/:trackId`      | `501`          | [`04`](04-curate-a-playlist.md)                                               |
| `POST /tracks/:id/retry`                     | `501`          | [`04`](04-curate-a-playlist.md)                                               |
| `GET /accounts`                              | `501`          | [`05`](05-share-a-playlist.md)                                                |
| `GET /playlists/:id/shares`                  | `501`          | [`05`](05-share-a-playlist.md)                                                |
| `POST /playlists/:id/shares`                 | `501`          | [`05`](05-share-a-playlist.md)                                                |
| `DELETE /playlists/:id/shares/:accountId`    | `501`          | [`05`](05-share-a-playlist.md)                                                |
| `GET /playlists/:id/tracks`                  | does not exist | [`03`](03-read-a-playlist.md)                                                 |
| `POST /tracks`                               | does not exist | [`04`](04-curate-a-playlist.md), the batch add                                |
| `POST /playlists/:id/tracks`                 | `501`          | removed by [`04`](04-curate-a-playlist.md), replaced by `POST /tracks`        |

### Everything else

| Work                                                   | Spec                                                                   |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| The reconcile: add, keep, retain, suppress             | [`01`](01-sync-a-playlist.md)                                          |
| A failed sync changing nothing                         | [`01`](01-sync-a-playlist.md)                                          |
| The download worker's claim and state transitions      | [`02`](02-store-a-track.md)                                            |
| Thumbnail fetching                                     | [`02`](02-store-a-track.md)                                            |
| Writing suppressions                                   | [`04`](04-curate-a-playlist.md)                                        |
| The orphan prune                                       | [`06`](06-prune-orphans.md)                                            |
| The player, the queue, and the track list as the queue | [`07`](07-play-stored-audio.md)                                        |
| The library screen, the item, the add flow             | [`08`](08-see-the-library.md)                                          |
| The detail screen's refresh, invalidation and re-auth  | [`09`](09-keep-the-screens-current.md)                                 |
| The mobile access flow                                 | out of scope in this corpus, ADR 0008 and `07-provision-mobile-access` |
| The design foundation                                  | done, ADR 0009 and `10-build-design-foundation`                        |
| The mobile client                                      | out of scope in this corpus, `06-scaffold-mobile`                      |

## Out of scope in this corpus

- Mobile: the Expo client, the provisioning flow, and ADR 0008.
- The permanent non-goals: sharing outside the instance, public or unauthenticated access, casting, social
  features, scrobbling, transcoding, video, file export or download endpoints, favorites, ratings, play counts,
  and search.
- Offline playback and a service worker.
- Reordering a playlist, a queue, or a track within either.
