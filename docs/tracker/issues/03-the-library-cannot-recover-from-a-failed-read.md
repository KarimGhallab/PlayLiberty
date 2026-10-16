# 03: The library cannot recover from a failed read

**State:** `resolved`
**Category:** `bug`

## Outcome

A blocking read failure now offers a way back, on all three surfaces. A new `ReadFailure` component draws the server's `detail` when the error is an `ApiError` that carries one and the fallback sentence otherwise, with one secondary **Try again** that refetches the read that failed and locks while it works. The library, the playlist detail's tracks read and the share dialog all draw it, and the dialog's retry refetches both of its reads. The library has a "The failed read offers a way back" state beside loading, empty and signed-out, and its now-unused `&__note` style was removed.
