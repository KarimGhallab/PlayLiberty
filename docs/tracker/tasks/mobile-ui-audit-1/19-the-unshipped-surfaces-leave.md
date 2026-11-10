# 19: The unshipped surfaces leave

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`
**Source:** [The mobile app's UI misses its contract](../../issues/105-the-mobile-apps-ui-misses-its-contract.md)

## Outcome

`docs/DESIGN.md` now says the track list is the queue and the bar is the transport above it; the sheet promise is
gone. The empty `QueueSheet` directory, the `app/prototype/notice` route, its `NoticePrototype` view and the
`PrototypeSwitcher` are deleted. A stale issue 78 note that named the switcher was reworded.

`rg "QueueSheet|prototype/notice|PrototypeSwitcher" apps/mobile docs` returns only this ticket's record.
