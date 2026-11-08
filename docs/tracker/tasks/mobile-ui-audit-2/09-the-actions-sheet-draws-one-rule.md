# 09: The actions sheet draws one rule

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile UI still misses its contract](../../issues/106-the-mobile-ui-still-misses-its-contract.md)

## Outcome

The summary drops its bottom rule when the sheet has no actions, leaving the settings' top rule as the one separator.
With actions, the summary rule and the per-row rules are unchanged. A new sheet test asserts both cases. The Grèce
detail sheet now shows one rule between the sync evidence and the skip setting.
