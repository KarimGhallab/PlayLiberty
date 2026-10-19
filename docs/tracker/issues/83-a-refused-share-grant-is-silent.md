# 83: A refused share grant is silent

**State:** `needs-triage`
**Category:** `bug`

**Blocked by:** None. Can start immediately.

## Agent Brief

**Category:** bug
**Summary:** Granting a share has no error path: the toggle derives from the server's share list, so a refused grant simply does not move, with no message.

**Current behavior:**
`SharePlaylistDialog.setLevel` calls `grant.mutate({ accountId, level }, { onSettled })` with no `onError`. The pressed state comes from `levelOf(account.id)` over the shares read, so a failure leaves the control exactly as it was.

**Desired behavior:**
A refused grant surfaces a notice naming the account and the reason, the way a failed pin opens the library's notice.

**Key interfaces:**

- The page's notice surface is the model; the dialog sits inside it.
- The problem-code mapping already words server refusals.

**Acceptance criteria:**

- [ ] A refused grant shows a message and does not leave the toggle ambiguous.
- [ ] A successful grant is unchanged.
- [ ] A test holds the refusal path.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.

**Out of scope:**

- The share permission model and the server route.

## Observed

- `SharePlaylistDialog.tsx` grants and revokes with no `onError`.

## Expected

- No control changes state silently or fails silently.

## Evidence

- `apps/web/src/shared/components/SharePlaylistDialog/SharePlaylistDialog.tsx:70-80`.
- Impeccable critique of `apps/web`, 2026-10-19, minor observations.
