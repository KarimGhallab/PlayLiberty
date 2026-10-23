# 04: Amend the cover documents

**What to build:** The product, architecture and glossary records describe the shipped behavior: a new cover is auto-oriented, cropped to the chosen square and then capped at 1600px; the uncropped original is not kept; existing covers keep their aspect.

**Blocked by:** None, can start immediately.
**Status:** open
**Labels:** `enhancement`, `ready-for-agent`

- [ ] The product capability says a cover can be set, cropped or removed.
- [ ] The architecture's image decision records orient, then crop, then cap, and says existing covers are not re-cropped.
- [ ] The glossary's custom cover and cover file entries say the stored cover is the square crop and the original is discarded.
- [ ] Spec 14's crop exclusion points at spec 17, so a reader does not land on a contradiction.
- [ ] The design record does not promise a dark stage or a second crop screen.

**Verification:** The documents read consistently; `npx prettier --check docs` passes.
