# Glossary

One word per idea. When a concept has two names here, pick the one in the left column and change the other.

## Accounts and access

| Term         | Meaning                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Account      | A person's identity on the instance, auto-provisioned from Pangolin on the first authenticated request. The app holds no password. |
| User id      | The stable Pangolin user id. The account key; never the display name.                                                              |
| Role         | `admin` or `user`. Admin manages users and server settings, with no playlist moderation.                                           |
| Owner        | The account that created a playlist. Only the owner manages its shares and deletes it.                                             |
| Share        | A grant of access to one playlist to one account, at level `read` or `write`. Owner-managed.                                       |
| Collaborator | An account holding a share on a playlist.                                                                                          |

## Content

| Term               | Meaning                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Track              | One server-wide playable item, keyed by video id. The only thing stored and streamed.                                                |
| Video id           | The YouTube video id. The identity of a track and the dedup key: one file per video id, shared by every playlist that references it. |
| Playlist           | A named, owner-owned, ordered collection of tracks. In v1 the only kind is the Synced playlist.                                      |
| Synced playlist    | A playlist that mirrors a YouTube source. Created by pasting a URL; refreshed manually in v1.                                        |
| Source             | The YouTube entity a synced playlist mirrors, a playlist URL or a single video URL, identified by its source id.                     |
| Association        | The link of a track to a playlist. A track can have many associations. Never "membership".                                           |
| Remote association | An association created by sync from the source.                                                                                      |
| Manual association | An association created by pasting a single video URL and choosing playlists.                                                         |
| Suppression        | A record per `(playlist, video id)` that stops a refresh from re-adding a remote association the user removed.                       |
| Media store        | The server-wide set of stored tracks and thumbnails. There is no global Library view in v1; playlists are the only entry point.      |

## Sync and lifecycle

| Term           | Meaning                                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------------------- |
| Sync           | Reconciling a synced playlist with its source: add new videos, never delete stored tracks.                      |
| Refresh        | A user-triggered sync. The only sync trigger in v1.                                                             |
| Sync run       | One execution of a sync: `running`, `completed`, or `failed`, with counts added, retained, removed, and failed. |
| Download       | Fetching the audio for one track, through yt-dlp. Drives the track states below.                                |
| Retention      | The rule that a source removal never deletes a stored track.                                                    |
| Orphan         | A track with zero associations. The weekly prune deletes orphans permanently; the interval is configurable.     |
| Remote-removed | `fileStatus: stored` plus `sourceStatus: removed`. Playable and retained: the promise of the product.           |
| Unavailable    | `fileStatus: unavailable` plus `sourceStatus: removed`. Never fetched, now gone; terminal and not playable.     |

## Track states

| Field                 | Values                                                      |
| --------------------- | ----------------------------------------------------------- |
| `Track.fileStatus`    | `pending`, `downloading`, `stored`, `failed`, `unavailable` |
| `Track.sourceStatus`  | `available`, `removed`                                      |
| `Association.origin`  | `remote`, `manual`                                          |
| `Playlist.syncStatus` | `idle`, `syncing`, `error`                                  |

## Playback and delivery

| Term          | Meaning                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| Stream        | Server-to-client delivery of a stored track over HTTP with `Range` support. No transcoding. |
| Range request | A partial-content request that lets a client seek within a track.                           |
| Queue         | Per-client playback state. Not stored on the server.                                        |
| Offline       | A client-side copy for playback without the server. Out of scope in v1.                     |

## Out of scope in v1

Sharing outside the instance, public or unauthenticated access, casting, social features, scrobbling, transcoding, video, file export or download endpoints, favorites, ratings, play counts, and search.

## Terms that are easy to mix up

- **Association** vs **Share**: an association links a track to a playlist; a share links an account to a playlist. Different axes. Never say "membership" for either.
- **Track** vs **Video**: a track is what the server stores; a video is its source on YouTube. The media store holds tracks.
- **Playlist** vs **Source**: the playlist is ours and lives on the server; the source is YouTube's and is only read during sync.
- **Removal** vs **Remote-removed** vs **Deletion**: removal suppresses one association; remote-removed means the source video is gone but the track is retained; deletion is the orphan prune removing media.
- **Stream** vs **Download**: streaming is the only delivery. A download endpoint would be file export, a non-goal.
- **Sync** vs **Refresh**: sync is the operation; refresh is the manual trigger for it.
