# Skip non-music parts

Status: resolved
Labels: `enhancement`

## Problem Statement

YouTube music does not always begin as music. An official video opens with talk, a long upload carries a
sponsor read or a self-promotion between songs, a concert or mix video pauses while the performer addresses the
room. PlayLiberty stores the source whole, so every play of such a track starts with the part the listener did
not ask for, and there is no setting to leave it out. The listener's only recourse is to seek past it by hand,
every time, on every device.

The second problem is the one that decides the shape. The choice belongs to a playlist and is made by one
account, but the media store is server-wide and holds one file per video, shared by every playlist and every
account that references it. A per-playlist setting therefore cannot mean a per-playlist file. Worse, the
download worker that fetches the audio is playlist-agnostic: it claims a `pending` track and downloads it by
video id, with no playlist in scope. The decision has to be made once, recorded where the worker can read it,
and then lived with.

## Solution

At download time the server asks SponsorBlock which parts of a track are not music, and cuts those ranges out
of the stored audio with a lossless stream copy. A playlist carries a "Skip non-music parts" setting, on by
default and chosen when the playlist is created and editable later by the owner and a write collaborator; the
track records the decision the first time any playlist fetches it, so a change is the default for tracks
created from then on and is never retroactive. A track is therefore stored already trimmed, one file per video, with its stored duration
matching what is heard. A video with no SponsorBlock data is stored whole. A video whose SponsorBlock lookup
fails fails the track and waits for the next sync, and the listener can force a single fileless track to be
fetched whole when the trimmed result is wrong.

## Implementation Decisions

- **The policy is one boolean, `skipNonMusic`, chosen at playlist creation and editable after it.** It defaults
  to `true`, is set when a playlist is created, is returned on the playlist read, and is drawn as a switch the
  owner and a write collaborator may flip and a read collaborator sees disabled. _Decided here:_ editable rather
  than frozen. The write is not retroactive, because the setting is the default for tracks created from then on
  and a track records its own value at creation; an editable setting is therefore honest, since it changes the
  default rather than lying about tracks already stored.
- **The worker cannot see a playlist, so the decision is recorded on the track at creation.** The `track` row
  gains a `skip_non_music` column, written once when the track row is created, from the creating playlist's
  value. A sync uses the playlist being synced. The manual add, which creates one track for a list of
  playlists, uses the first writable playlist id in request order. First-wins is not a new rule: it is the
  existing one-file-per-video dedup restated, and it is why the setting's write is not retroactive.
- **The flag reaches yt-dlp through the adapter, never through the worker's SQL.** `DownloadTrackRequest`
  carries `skipNonMusic`, and the download arguments add `--sponsorblock-remove music_offtopic,sponsor,selfpromo`
  when it is true. The three categories are fixed in code. `music_offtopic` is the only one that literally
  means the music stopped; `sponsor` and `selfpromo` cover the spoken breaks in long uploads.
- **The removal is a lossless stream copy, and the flag that would break that is never passed.**
  `--sponsorblock-remove` concatenates the kept ranges with `-c copy`; `--force-keyframes-at-cuts` would
  re-encode the whole file first and must never appear on this path. Verified against a Format 140 download:
  the remaining AAC packets are byte-identical to the source, aligned to a 1024-sample frame, at the same bit
  rate, still AAC in M4A. This is what keeps
  [Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded) true and the server encoder-free.
- **A SponsorBlock lookup that fails is a failure, not a gone video.** The adapter classifies yt-dlp's own
  phrases into a new typed error, mirroring the unavailable-video classification. The worker records
  `fileStatus: failed` with a stable, readable reason and never `unavailable`. _Decided here:_ the reason is a
  fixed string rather than the tool's stderr, so the client can render it and the retry semantics stay legible.
- **The retry is the existing sync retry, and only the listener can bypass the removal.** No timer and no
  second process: a failed track already returns to `pending` on the next sync, and it is retried with the same
  logic. The bypass flips the track's `skip_non_music` to `false` and returns it to `pending`, so the next
  attempt fetches the file whole. Nothing retries forever behind the user's back, and nothing flips to the
  bypass on its own.
- **The bypass is offered only for a track with no stored file.** A stored file is shared by every association,
  so a bypass that overwrote it would change every other playlist that references the video. The bypass
  therefore means "this track has no file, fetch it whole", and nothing more. Healing an already-stored track
  is an operator deleting the media object, not a per-listener action.
- **There is no over-removal guard.** A segment set that spans most of a track is honoured, because the
  community's own data and voting are the guard and a second ceiling would only add a silent exception.

- **There is no reprocessing when SponsorBlock data changes.** Segment data is community-edited and drifts, and
  the app re-reads nothing after the download. The consequence is stated plainly: a wrong
  segment set is permanent for a stored track, recoverable only by the bypass on a fileless track.
- **A video with no segments, or none in the three categories, is stored whole and is not a failure.** The
  same result follows when yt-dlp drops a segment whose stored `videoDuration` no longer matches the video, so
  the two are indistinguishable after the fact and neither is wrong.
- **`mute` segments are not honoured.** yt-dlp only asks for `skip`, `poi` and `chapter` actions, so a segment
  marked `mute` is never returned and is neither skipped nor silenced. Recorded so that nobody later expects
  muting.
- **No segment list is persisted.** The file is the record of what was removed; the per-track count and the
  outcome are logged, not stored. This is what the non-retroactive write and the no-reprocess rule require:
  there is no second copy of the decision to drift from the file.
- **The stored duration is the file's truth.** The adapter probes the finished file and returns its duration,
  and the worker writes it to the track on success. This is required because a trimmed file is shorter than its
  source, and it also removes the existing drift between the source metadata and the actual stream. The probe
  runs for every download, trimmed or not.
- **The prefer-AAC selector already exists and this spec ratifies it.** The download arguments already ask for
  `bestaudio[ext=m4a]/bestaudio`, so a video with no AAC stream falls back to Opus today.
  [Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded) is amended to say AAC preferred, Opus tolerated
  when no AAC exists, never transcode, and it names the Safari caveat that the Opus fallback carries.
- **An outage costs a full download per retry, and that is accepted.** yt-dlp fetches the whole file before it
  exits non-zero on a SponsorBlock error, so a failed attempt is not free. The alternative, pre-flighting the
  API in our own code, would reimplement the tool's hash lookup and filters and would be a second thing to keep
  in step.
- **Inherited constraints are owned by the architecture and not restated here:** no transcoding, ever, and the AAC/M4A
  store with the Opus tolerance ([Audio is stored as-is, never transcoded](../../ARCHITECTURE.md#audio-is-stored-as-is-never-transcoded)), identity from the
  forwarded edge headers ([Identity comes from Pangolin's forwarded headers](../../ARCHITECTURE.md#identity-comes-from-pangolins-forwarded-headers)), and the client
  header with the origin check ([Mutating requests carry a client header and pass origin checks](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks)).

## Out of Scope

- Client-side skipping of a stored segment map. The trim happens once, at download.
- Editing the setting after creation, and any policy surface beyond the single per-track bypass.
- Backfilling or reprocessing existing tracks, and any guard against an over-broad segment set.
- User-configurable categories, and any category beyond the three fixed here.
- Muting a segment as opposed to skipping it.
- Any transcoding, and any format work beyond the existing AAC-first selector and its Opus fallback.
- Healing an already-stored track, which is an operator action on the media object.
- Any client surface beyond the playlist detail's track row, where the state word, the server's failure sentence
  and the bypass control live.
