# Glossary

One word per idea. When a concept has two names here, pick the one in the left column and change the other. The product's non-goals live in [PRODUCT.md](PRODUCT.md#non-goals).

## Accounts and access

| Term         | Meaning                                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Account      | A person's identity on the instance, auto-provisioned from Pangolin on the first authenticated request. The app holds no password.                                                         |
| User id      | The stable Pangolin user id. The account key; never the display name.                                                                                                                      |
| Role         | `admin` or `user`. Admin manages users and server settings, with no playlist moderation.                                                                                                   |
| Owner        | The account that created a playlist. Only the owner manages its shares and deletes it.                                                                                                     |
| Share        | A grant of access to one playlist to one account, at level `read` or `write`. Owner-managed.                                                                                               |
| Collaborator | An account holding a share on a playlist. A `write` collaborator may add a track, remove a track and sync. They may not rename, delete, or manage shares: those three stay with the owner. |

## Content

| Term               | Meaning                                                                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Track              | One server-wide playable item, keyed by video id. Its audio is the only media streamed.                                                                                                                  |
| Video id           | The YouTube video id. The identity of a track and the dedup key: one file per video id, shared by every playlist that references it.                                                                     |
| Playlist           | A named, owner-owned, ordered collection of tracks. In v1 the only kind is the Synced playlist.                                                                                                          |
| Playlist cover     | The image a playlist draws: its custom cover when one is set, otherwise its first track's thumbnail, otherwise its sleeve.                                                                               |
| Custom cover       | One image per playlist, chosen by the owner or a write collaborator and shared with every reader. A new upload is stored as the chosen square and the uncropped original is not kept. Never per account. |
| Cover file         | The normalised WebP under `covers/` for a custom cover. A new file is the square crop of the upload; one stored before cropping keeps its aspect. Immutable and versioned; never a track thumbnail.      |
| Sleeve             | The hue a playlist draws when it has no image at all, derived from its id and never stored. The last fallback of the cover.                                                                              |
| Gallery            | The playlists an account can see, presented as one collection on the library. Never "shelf".                                                                                                             |
| Pin                | One account's own placement of a playlist above the rest of its gallery. Per account, so it never moves another's. Never "favorite".                                                                     |
| Synced playlist    | A playlist that mirrors a YouTube source. Created by pasting a URL; synced manually in v1.                                                                                                               |
| Source             | The YouTube entity a synced playlist mirrors, a playlist URL or a single video URL, identified by its source id.                                                                                         |
| Association        | The link of a track to a playlist. A track can have many associations. Never "membership".                                                                                                               |
| Remote association | An association created by sync from the source.                                                                                                                                                          |
| Manual association | An association created by pasting a single video URL and choosing playlists.                                                                                                                             |
| Suppression        | A record per `(playlist, video id)` that stops a sync from re-adding a remote association the user removed.                                                                                              |
| Media store        | The server-wide set of stored tracks, thumbnails and cover files.                                                                                                                                        |

## Sync and lifecycle

| Term           | Meaning                                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync           | Reconciling a synced playlist with its source: add new videos, never delete stored tracks. One word for the operation, for the action that starts it, and for the state it is in. |
| Sync run       | One execution of a sync: `running`, `completed`, or `failed`, with counts added, retained, removed, and failed.                                                                   |
| Download       | Fetching the audio for one track, through yt-dlp. Drives the track states below.                                                                                                  |
| Retention      | The rule that a source removal never deletes a stored track.                                                                                                                      |
| Orphan         | A track with zero associations. The weekly prune deletes orphans permanently; the interval is configurable.                                                                       |
| Remote-removed | `fileStatus: stored` plus `sourceStatus: removed`. Playable and retained: the promise of the product.                                                                             |
| Unavailable    | `fileStatus: unavailable` plus `sourceStatus: removed`. Never fetched, now gone; terminal and not playable.                                                                       |

## Track states

| Field                 | Values                                                      |
| --------------------- | ----------------------------------------------------------- |
| `Track.fileStatus`    | `pending`, `downloading`, `stored`, `failed`, `unavailable` |
| `Track.sourceStatus`  | `available`, `removed`                                      |
| `Association.origin`  | `remote`, `manual`                                          |
| `Playlist.syncStatus` | `idle`, `syncing`, `error`                                  |

The user-facing word for `fileStatus: stored` is **stored** in English and **stockée** in French, wherever the state appears: the filter chip, the incomplete badge, the empty promise and the row.

## Playback and delivery

| Term          | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| Stream        | Server-to-client delivery of a stored track over HTTP with `Range`.     |
| Range request | A partial-content request that lets a client seek within a track.       |
| Queue         | Per-client playback state. Not stored on the server.                    |
| Offline       | A client-side copy for playback without the server. Out of scope in v1. |

## Egress

| Term   | Meaning                                                                                 |
| ------ | --------------------------------------------------------------------------------------- |
| Egress | The address a source read or download leaves through.                                   |
| Exit   | The remote endpoint a WireGuard config routes through.                                  |
| Switch | The user-facing action: apply the config if needed, then check it. The exit changes.    |
| Check  | Read the active config's handshake, exit address and one listing. Never switches.       |
| Apply  | The internal rotation primitive: apply a config without checking it. Not a user action. |

## Language

| Term     | Meaning                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Language | `en` or `fr`. The language the interface is rendered in. Resolved once per browser, from an explicit choice, then the browser's preference, then `en`. Per browser, never on the account, and never known to the server. The control that changes it sits on both the library and the playlist detail. |
| Locale   | A browser preference tag such as `fr-CA`, matched to a supported Language by its base. The app stores the resolved Language, never the tag.                                                                                                                                                            |

## Terms that are easy to mix up

- **Association** vs **Share**: an association links a track to a playlist; a share links an account to a playlist. Different axes. Never say "membership" for either.
- **Track** vs **Video**: a track is what the server stores; a video is its source on YouTube. The media store holds tracks.
- **Playlist** vs **Source**: the playlist is ours and lives on the server; the source is YouTube's and is only read during sync.
- **Removal** vs **Remote-removed** vs **Deletion**: removal suppresses one association; remote-removed means the source video is gone but the track is retained; deletion is the orphan prune removing media.
- **Stream** vs **Download**: streaming is the only delivery. A download endpoint would be file export, a non-goal.
- **Language** vs **Locale**: a language is one of the two the interface is written in, `en` or `fr`; a locale is the browser's preference tag, `fr-CA`, that resolves to one. The app stores the language and never the tag.
- **Pin** vs **Favorite**: a pin is one account's placement of a playlist above the rest of its own gallery; a favorite would be a judgement about a thing. The feature is a pin, so the two words are never one.
- **Playlist cover** vs **track thumbnail**: a playlist cover belongs to the playlist and every reader sees the same image; a track thumbnail belongs to the track. The first track's thumbnail is only the fallback for a playlist with no custom cover.
- **Interface language** vs **user content**: the interface language is the app's and switches with the language button; a playlist name, a track title and an account name are the source's or the user's and are never translated.
- **Switch** vs **check** vs **apply**: a switch applies the config if needed and checks it; a check reads the active config without switching; an apply is the internal rotation primitive that skips the check.
