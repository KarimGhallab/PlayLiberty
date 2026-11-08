# 24: A share never carries the collaborator's email or role

**State:** `resolved`
**Category:** `bug`

## Outcome

A share names the collaborator with the summary shape only. `ShareSchema.account` is now `AccountSummarySchema` (id, displayName, avatarUrl) rather than the wide `AccountSchema`, and `toShareView` uses the new `toAccountSummary` beside `toAccountView`, while `/me` keeps the wide `Account`. The web share dialog reads only `accountId` and `level`, so the narrowing is transparent, and its mock was trimmed to match the server. A test seeds a collaborator with an email and the admin role and asserts the raw grant and list bodies carry neither field, the counterpart of the directory's test.
