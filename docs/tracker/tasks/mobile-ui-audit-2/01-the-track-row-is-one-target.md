# 01: The track row is one target for the screen reader

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The play layer's label already carries the track title, its state and its duration, but the same title, state and
duration remain separate accessibility nodes. TalkBack reads the button, then the title, then the state, then the
duration, then the lane. A 44-track playlist becomes more than 176 focus stops.

## Expected

One accessible target per row: the play label. The lane and the failure disclosure remain separate controls. The
visual content is hidden from accessibility, as the gallery card already does. The disclosure is a sibling of the
hidden content, because `no-hide-descendants` cannot be overridden by a child.

## Evidence

- `apps/mobile/src/views/playlist/TrackRow/TrackRow.tsx`: the play layer's `accessibilityLabel` and the visible
  `track-title`, `track-state` and `track-duration` texts.
- The emulator dump: the play button's `content-desc` is the full row, and `track-title` and `track-duration` are
  separate `TextView` nodes.
- `apps/mobile/src/views/library/PlaylistCard/PlaylistCard.tsx`: the card already hides its content with
  `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"`.

## Acceptance criteria

- [x] The title, state and duration are not separate accessibility nodes while the play layer exists.
- [x] The lane and the failure disclosure remain reachable and keep their labels.
- [x] A row with no play layer still exposes its content.
- [x] A test asserts the row's accessibility tree: the play label, the disclosure and the lane.

## Outcome

The title, the state word and the duration sit in wrappers that take `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"` while the play layer exists. The failure sentence moved out of the
hidden state wrapper, so a playable row whose source broke still reads it, and the disclosure stays a sibling of the
hidden copy. An unplayable row passes no hiding props, so its copy reads as before.

The row test now asserts the play label as the row's one button, the hidden title and duration, the sentence, the
disclosure and the lane. The emulator's dump of the detail lists `track-play` and `track-actions` as the row's only
focusable nodes; `track-title` and `track-duration` are still drawn but `focusable="false"`, the same shape the gallery
card's hidden content already had.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass, and the
emulator's accessibility dump shows one row node plus the lane.
