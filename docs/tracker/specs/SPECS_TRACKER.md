# Specs

Feature specs, written by `/to-spec`. One file per spec, named `NN-slug.md` and numbered in creation order.

## Conventions

- A spec states the problem, the agreed behaviour, and the constraints that bound the solution. It is not a plan and not a task list.
- Specs are the source a set of tickets is cut from, so they must be decidable: a reader should be able to say whether a given implementation satisfies them.
- Once implemented, the spec stays as the record of what was agreed. Do not rewrite it to match what shipped; write an ADR for a decision that changed.
