# The equalizer strip

> Part of the design system. Index and cross-cutting rules: [`DESIGN.md`](../../DESIGN.md).

`docs/design/specimen.css` holds it, because the playlist header and the track row both use it and the
phase table is twenty rules long. Duplicated into the two specimens it would be two tables that could
disagree, and a phase table that disagrees with itself produces two bars moving as one, which no
screenshot would ever show.

A bar is 3px wide with a 4px gap. That is a 7px pitch, and the count solves `7n - 4` against the
artwork's content box: 14 bars fill the 96px cover's 94px exactly and 6 fill the 40px thumbnail's 38px
exactly. The gap is a floor rather than the whole arrangement, because the strip also carries
`space-between`. Browsers snap a 1px border to whole device pixels, so on a 1.25x display the cover's
content box is 94.4 and a fixed-gap row of 14 bars stops 0.4px short of the artwork's edge. The leftover
is shared across the 13 gaps at 0.03px each instead, and the strip reaches both edges at any pixel ratio.
**The fill is a property of the layout, not of the arithmetic**, which is the whole reason for the
`space-between`: a build that satisfied the arithmetic and used `content-box` instead of `border-box` came
up 2px short.

The strip reaches half way up the artwork, from one rule, so the cover carries 14 bars 47.2px tall and the
thumbnail carries 6 bars 19.2px tall out of the same two declarations. Half the artwork is tall enough to
read as an equalizer rather than as a comb, and reading as one is the entire job.

**The phases are derived, and the rule is in the artifact.** Phase `i` is `(i * stride) mod M` where
`M = 2n - 1`, the delay is `-(phase / M) * 1400ms` rounded to 10ms, and the resting height is the same
walk read through a five-value cycle. Two properties of that rule are load-bearing. `gcd(stride, M) = 1`
is what guarantees no two bars share a phase. And `M = 2n - 1` rather than `n` is what stops the phases
being an evenly spaced staircase, which reads as a wave sweeping across the strip; at 6 bars every
coprime stride produces one. A `-2.2s` delay on a `2.2s` animation is the counter-example, and it is
phase-identical to zero, so two of three bars move as one, and no reader of the source could tell, because
`-2200ms` and `0ms` are two different numbers and one phase. Check `2l` re-derives all twenty delays and
all twenty resting heights from the declared parameters, the period, and the bar count in the markup, so
the table cannot be edited by hand without failing.

**There is no scrim, and that is a decision with a measured price.** `coverUrl` and `thumbnailPath` are
arbitrary images, so this is the one place in the system where ink lands on a surface whose contrast
cannot be computed. A scrim to an opaque `--surface` would put every bar on a known surface at 5.40:1,
and it cost a quarter of the cover under a gradient. It is not used, because a half-height strip and a
bottom band are not the same object, and a band short enough not to eat the artwork is too short to read
as music.

So the price is written down rather than left to be discovered. `--accent` on an arbitrary cover measures
**5.23:1 on a #1a1a1a cover**, which is fine, **3.33:1 on a #ffffff one**, which is marginal, **1.68:1 on
a #b8b8b8 one**, and **1.60:1 on a #6b6b6b mid grey**, which is not. Mid-tone covers are common. A user
with a mid-tone cover gets bars they can barely see, and that is accepted in exchange for bars that read
as an equalizer at all. The four hexes are named so the figures can be recomputed; they are not tokens
and nothing in the token set can move them.

Nothing in the tree can catch that, and it is worth being blunt about why. All nine specimens draw their
artwork as a flat `--surface-raised` box, on which the bars measure 5.40:1 and look correct. A scrim check
would have nothing to fire on, and a check that cannot fire reports a safety that is not there. The
reserved rule lives beside the strip in `specimen.css`. If a scrim ever comes back, its last colour stop
has to be fully opaque and at or above the top of the strip, so that no bar is ever drawn on a partly
transparent pixel.
