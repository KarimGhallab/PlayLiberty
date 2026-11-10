# 11: Share the egress vocabulary

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

`@playliberty/i18n` exports `EgressAction`, `EgressNotice`, `egressStatusLabel`, `egressReasonLabel`, `egressTimeLabel`, `egressSuccessNotice`, `egressUnreachableNotice` and `egressFailureNotice`. The status table is exhaustive over `EgressStatus`, and an unknown reason falls back to the generic sentence.

The web egress page and the mobile egress screen delete their local status, reason and time helpers and their local message keys. Web keeps its toast stack, mobile keeps its notice.
