# 05: The server speaks codes, the client owns the sentence

**What to build:** the server returns a stable code and structured parameters and the client owns the sentence.
`ProblemSchema` gains `params`; where the copy varies under one code (the four `playlist_not_found` details) the
difference travels as a parameter; a Zod validation failure becomes a structured code instead of Zod's English
prose; the client maps a problem code to a catalog sentence and falls back to the server's English for an
unmapped code. A refusal reads in the chosen language.

**Blocked by:** [`01`](01-the-package-the-provider-and-the-language-switch.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] `ProblemSchema` carries `params`, the server fills it where the copy varies, and the server's `title` and
      `detail` remain as the English fallback.
- [ ] A validation failure reaches the client as a structured code and parameters, not as Zod's English message.
- [ ] The client renders a known problem code as a catalog sentence and an unmapped code as the server's English.
- [ ] The existing server and client problem tests keep passing in `en`.
- [ ] `pnpm run build`, `pnpm run lint` and the unit suites pass.
