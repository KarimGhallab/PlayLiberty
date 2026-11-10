# 13: The library shows its scrollbar and the detail hides it

**Status:** resolved
**Labels:** `bug`, `ready-for-agent`
**Source:** [A second design critique scores the mobile app 26/40](../../issues/123-a-second-design-critique-scores-the-mobile-app-26-40.md)

## Outcome

Implemented on 2026-11-06. The rule is hidden on both, and it lives in one module.

`apps/mobile/src/shared/components/List/listChrome.ts` exports `verticalListChrome`, the prop set every vertical list
spreads. The gallery and the detail both use it, so neither screen states the indicator itself and a third list inherits
the same chrome by construction. `listChrome.test.ts` pins the value.

Verified on the emulator at 1.0: the gallery scrolled with no scrollbar at the right edge
(`/tmp/opencode/t13/lib-scrolled.png`), and the detail scrolled the same way (`detail-scrolled.png`).

The root build, lint and unit run follows in the batch for this session.
