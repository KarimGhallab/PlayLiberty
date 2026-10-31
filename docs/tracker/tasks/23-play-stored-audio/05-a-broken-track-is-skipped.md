# 05: A broken track is skipped and a refusal is explained

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** [`01`](01-the-bar-plays-the-queue.md)

## What to build

A queued track whose stored file has gone, and a track that fails to load mid-stream, are dropped when the failure is
reached and playback continues with the next entry. Dropping the last entry stops playback and removes the bar. A
track with no stored file never enters the queue, and its row offers no play target.

A refusal is handled by kind. A `404` drops the entry and advances. A `401` is the shell's signed-out state and is
never drawn as a broken track. Any other refusal pauses on the current track and draws a notice naming the track and
saying that playback could not start or continue; the queue stays where it is so play can be pressed again. A
classification that arrives after the playhead has moved does nothing.

The notice and the playback copy are in both catalogs.

## Acceptance criteria

- [ ] A `404` at load or mid-stream drops that entry and advances to the next one.
- [ ] Dropping the last entry stops playback and removes the bar.
- [ ] A `401` ends the session instead of drawing a playback failure.
- [ ] Any other refusal pauses and explains itself with a notice naming the track.
- [ ] A late failure classification does not act on a track that is no longer current.
- [ ] The failure copy exists in English and French.

## Verification

- Store and audio unit tests cover the drop, the advance, the `401` and the late classification, with the stream
  classifier stubbed.
- On the emulator: remove a queued file on the server and reach it, then confirm the next track plays and the bar
  moves on.

See [`23-play-stored-audio`](../../specs/23-play-stored-audio.md).
