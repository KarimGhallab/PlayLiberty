# 83: A refused share grant is silent

**State:** `resolved`
**Category:** `bug`

## Outcome

A refused grant now opens a notice naming the account, with the server's mapped reason underneath. The dialog owns the refusal state and renders the page's `NoticeToast`; it withdraws on the same four-second window as the pin and setting notices. The toggle still derives from the shares read, so a refusal leaves it on the last truth the server gave and enabled for another attempt.

The same silent path on revoke is closed with its own sentence. `shareDialog.grantFailed` and `shareDialog.revokeFailed` name the account; `problemSentence` supplies the reason. A successful write is unchanged: the shares read still invalidates on the response.

Tests: the detail page holds both refusal paths, asserting the account sentence, the mapped reason, and the untouched toggle.
