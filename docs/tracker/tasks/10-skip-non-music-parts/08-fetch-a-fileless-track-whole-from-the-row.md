# 08: Fetch a fileless track whole from the row

**What to build:** A track with no stored file offers a control that forces it to be fetched without trimming,
beside its retry, so a listener whose SponsorBlock lookup failed, or who knows the source should stay whole, has
a way out. Pressing it calls the new route and leaves the track pending. The control is offered only when the
caller can write a playlist holding the track and the track has no stored file. The row also shows the track's
recorded policy, so a track that is full length when a trimmed one was expected is not a black box. The track
row draws one control in two shapes today, so this ticket settles how the bypass and the retry coexist and
records it.

**Blocked by:** [`02`](02-store-a-track-with-non-music-parts-skipped.md), [`05`](05-fetch-one-fileless-track-whole.md).

**Status:** ready-for-agent

**Labels:** `enhancement`, `ready-for-agent`

- [ ] A track with no stored file offers the bypass; a stored track does not.
- [ ] Pressing it calls the route and the row returns to pending.
- [ ] A caller who cannot write the playlist sees no control.
- [ ] The track's recorded policy is visible, so a full-length track reads as deliberate.
- [ ] The row's control rule is honoured and the design system record is updated.
- [ ] axe and the web unit suite pass.

**Verification:** the web unit suite, `pnpm run build`, `pnpm run lint` and `pnpm run design:check`.
