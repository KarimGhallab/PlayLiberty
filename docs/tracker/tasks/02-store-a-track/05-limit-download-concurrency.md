# 05: Run only a few downloads at a time

**What to build:** The instance stays responsive and does not hammer the source. The worker runs no more than
the configured number of downloads at once, claimed in one batch per pass, so a backlog larger than the cap is
worked through across passes rather than all at once.

**Blocked by:** 01.

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] No more downloads run at once than the configured concurrency.
- [ ] A pass with more pending tracks than the cap leaves the rest for the next pass.
