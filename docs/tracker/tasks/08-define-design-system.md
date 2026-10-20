# Define the design system token layer

**Status:** resolved
**Labels:** `enhancement`

## Outcome

The principle behind the token layer is sharing values and decisions, not components: TypeScript values in `packages/tokens` as the single source, with a build-time emitter writing the flat CSS stylesheet, and `packages/ui-foundation` for the non-rendering UI decisions (formatting and the track-state tone). The documentation that recorded the decisions has since been retired; the values belong to the following tickets.

See [where the values live](../../DESIGN.md#where-the-values-live).
