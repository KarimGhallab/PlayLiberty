# 11: Decoration leaves the accessibility tree

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The account avatar's monogram is a `Text`, so its initial is announced before the name. The sign-in sleeve images
have no `accessible={false}`.

## Expected

Decoration is silent; the account name and the sign-in title are read first.

## Evidence

- `apps/mobile/src/shared/components/AccountAvatar/AccountAvatar.tsx`: the monogram `Text`.
- `apps/mobile/src/shared/components/SignInDoor/ShelfSleeves.tsx`: the three `Image`s.

## Acceptance criteria

- [x] The monogram and the sleeves are not accessibility nodes.
- [x] The account name and the sign-in title remain readable.
- [x] A test asserts the avatar and the sleeves are hidden.

## Outcome

The monogram view takes `accessible={false}`, `accessibilityElementsHidden` and
`importantForAccessibility="no-hide-descendants"`, the same shape the gallery card uses, and the three shelf images
take `accessible={false}`. The account name and the sign-in title are untouched.

The avatar test asserts the monogram is hidden from a default query, and a new sleeve test asserts all three images are
not accessibility elements. The emulator's account sheet still reads the display name.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass.
