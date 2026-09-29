# Motion

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../DESIGN.md).

Transitions, and three loops, and nothing else: no page transitions, and no motion that is not carrying
a state. `--motion-fast` 120ms for hover, focus and the lamp coming on. `--motion-base` 180ms for a
state change a row can show. `--motion-slow` 240ms for the player bar and nothing else.

The three loops are the equalizer strip, and the two `pl-breathe` pulses, and that is the whole list. A
loop earns its place by expressing a state that is true right now: a loop that is merely decorative is a
loop that a reader with `prefers-reduced-motion` set loses entirely and gains nothing from. The two pulses
dim a row that is syncing or downloading, and the word beside them is what carries the state once the
motion stops. The strip says a playlist is playing.

There is one curve, `--ease-standard` `cubic-bezier(0.4, 0, 0.2, 1)`, and it is the only easing function
in the system. It decelerates into place, never overshoots, and is soft enough for a border colour
changing at 120ms while still carrying a 48px control at 240ms. It is named for the decision rather than
the shape, and it sits outside the `--motion-*` family on purpose: that family is all durations, and a
reader who finds a curve in it will read it as a time. The two decorative loops keep the `ease-in-out`
keyword rather than this one, because a loop is not a transition and a transition curve on a pulse
changes the pulse from a breath into a lurch.

A transition names a time and a curve and nothing else, and that is check `2k`. A bare number is not a
valid easing function, so a declaration carrying one is dropped whole and silently, and three controls
that were meant to move would snap instead with nothing reporting it.

There are two named keyframes. `pl-equalize` is the equalizer strip and is described under Components,
because its geometry is not a decision anyone can make by eye. `pl-play-pause` is the play to pause
morph. It moves a transform across a strip of eight frames with `steps(7, jump-end)`, so the shape
changes in eight hard cuts rather than tweening. Two things about it are load-bearing. The frame count
is eight because eight is the cheapest count that still reads as a shape changing rather than a
cross-fade; the measurements do not choose it, because the centre travel and the gap come out the same
to two decimals at 8, 11 and 16, so it is a decision and not a derivation. And the timing function is
`jump-end`, not the `jump-none` that reads more like every position counts: measured over the 168 unit
travel, `jump-end` gives seven intervals of 24, one per frame, and `jump-none` gives six intervals of 28,
so the strip rests between two frames for a quarter of every step. Neither the endpoints nor the bounding
box show that. Only the rendered positions do.

The resting frame is a state rule and not something the animation leaves behind, because an animation
that is merely paused still applies its keyframe value, and an animation beats a plain declaration. A
control that mounts showing play must not spend its first 180ms morphing to pause and come to rest there
against its own label.

`data-state` sits on the header rather than on the button, and the values are `playing` and `paused`.
Both halves were forced. The cover carries an equalizer strip that appears only while a playlist is
playing, the cover is the button's sibling, and CSS cannot reach a sibling from a button, so one fact
about the playlist has to be reachable from both of the things that express it. And on a button
`data-state="pause"` names the glyph that rests, which is honest because the button will pause; the same
value on a header would mean the playlist is paused, which is the opposite, and the next reader gets it
backwards. A state attribute has to name the state. The same attribute keys the transport, which is the
third thing in this header that exists only while the playlist is playing. `data-run` stays on the button,
because it describes that control's transition rather than a fact about the playlist.

A `prefers-reduced-motion: reduce` rule drops all three durations to zero and kills every animation. The
morph needs nothing further: the state rule is the only thing that decides which frame is showing, and a
reader who asked for no motion gets the correct one. The equalizer needs one thing and gets it for free:
`animation: none` does not reset a transform, it removes the thing that was animating it. So each bar
carries its resting height as a plain `scaleY` of a local property, the keyframes override that while the
animation runs, and the declaration shows through the moment the animation stops. There is one table of
resting heights and no second table under the media query to keep in step with it. A negative
`animation-delay` with no resting value beside it is check `2m`, because otherwise the strip freezes at
fourteen arbitrary heights and still looks like a strip, so nothing would report that the motion was
gone. The player bar additionally drops artwork transitions, seek smoothing and hover scale, while
keeping the position indicator and the focus ring, which carry information rather than decoration.
