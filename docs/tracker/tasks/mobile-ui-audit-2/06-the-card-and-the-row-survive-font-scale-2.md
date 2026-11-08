# 06: The card and the row survive font scale 2.0

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The card's cell is fixed, so its count, incomplete mark, state and owner cap at 1.3, the same cap the identity uses;
the meta wraps and the owner takes two lines if the capped text still overflows. The track row is not fixed, so above
1.3 the title takes a second line instead of losing its name; 1.0 and 1.3 keep one line.

Tests pin the card's cap and the title's line count at 2.0 and 1.3. The emulator at 2.0 draws "71 pistes 4 À jour" on
one line with the owner complete and track titles over two lines; 1.0 and 1.3 are unchanged.
