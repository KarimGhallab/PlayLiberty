# 09: The actions sheet draws one rule

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)
**Blocked by:** None. Can start immediately.

## Observed

The summary block has a bottom border and the settings block has a top border. When the playlist has no actions, the
two rules stack with a 12dp gap and read as an empty section. The Grèce sheet shows it.

## Expected

One rule separates the summary from the settings when there are no actions. With actions, the existing rules stay.

## Evidence

- `apps/mobile/src/views/library/PlaylistActionsSheet/PlaylistActionsSheet.tsx`: the summary and extra styles.
- The emulator screenshot of the Grèce actions sheet.

## Acceptance criteria

- [x] With no actions, one rule separates the summary and the settings.
- [x] With actions, the row rules are unchanged.
- [x] A test asserts the rule count or the style.

## Outcome

The summary drops its bottom rule when the sheet has no actions, leaving the settings' top rule as the one separator.
With actions, the summary rule and the per-row rules are unchanged. A new sheet test asserts both cases. The Grèce
detail sheet now shows one rule between the sync evidence and the skip setting.

## Verification

`pnpm --filter @playliberty/mobile run test` and `pnpm --filter @playliberty/mobile run typecheck` pass; the emulator
shows one rule.
