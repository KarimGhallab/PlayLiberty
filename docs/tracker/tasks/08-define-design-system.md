# Define the design system token layer

Status: resolved
Labels: `enhancement`

## Outcome

[`Sharing values and decisions, not components`](../../DESIGN.md#sharing-values-and-decisions-not-components) records the token layer: TypeScript values in `packages/tokens` as the single source, with a build-time emitter writing the flat CSS stylesheet, and `packages/ui-foundation` for the non-rendering UI decisions (formatting and the track-state tone). The record is [`DESIGN.md`](../../DESIGN.md); the values belong to the following design tickets. Tasks `09` and `10` amended the record twice, for the font family and for moving the design surface to hand-written HTML specimens.

## Verification

The record names no colour, mood or typeface value; the two packages and the design surface belong to the tickets after this one; the change is documentation only.
