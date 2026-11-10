# 01: Text over artwork is contrast-safe

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

The bar keeps its cover. The veil image at 0.45 and the `bg` scrim at 0.5 are unchanged, and both strengths now live
in the mobile token adapter so the test and the bar read one value. What changed is the text: the playlist name and
the seek times take `muted-on-art`, the queue count takes `accent-on-art`, and the unfilled rail takes
`muted-on-art`. The title and the step icons stay `ink`, and the play orb stays `accent`.

The two on-art shades are new tokens, measured against the bar's worst ground: a white cover over the lightest sleeve
at the veil, then the scrim. That ground is `rgb(72,80,88)`. `muted-on-art` `#c2c7cb` measures 4.81:1 and
`accent-on-art` `#7fd9b6` 4.88:1. A prototype compared this against a single ink voice; the ink voice flattened the
hierarchy and lost the rail into the cover, so the on-art shades won.

The detail header's cover ground dropped from 0.12 to 0.07, named `coverGroundOpacity` so the test and the header read
one value. The failed word measures 4.84:1 on the brightest possible cover, the muted time 5.31:1, and the shared
owner line 5.86:1. The header still takes a faint copy of its cover as its ground.

The mobile token test now loops the six sleeves and the bare-queue ground, composites the brightest cover at the veil
and scrim, and asserts both on-art pairs; it also asserts the header's failed word. The header pair was red first at
4.17:1 before the value changed.

On the emulator, a bright-cover playlist played from its first row: the cover tint stayed behind the bar, and the
title, `Chine`, `1/67`, the times and the rail all read. No failed playlist exists in the dev data, so the failed
word's pair is covered by the token test rather than a screenshot.
