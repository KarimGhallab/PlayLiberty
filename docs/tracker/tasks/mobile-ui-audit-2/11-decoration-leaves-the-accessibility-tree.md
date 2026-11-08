# 11: Decoration leaves the accessibility tree

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The monogram view takes `accessible={false}`, `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"`, the same shape the gallery card uses, and the three shelf images
take `accessible={false}`. The account name and the sign-in title are untouched.

The avatar test asserts the monogram is hidden from a default query, and a new sleeve test asserts all three images are
not accessibility elements. The emulator's account sheet still reads the display name.
