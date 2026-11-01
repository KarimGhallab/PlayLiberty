# 01: The country lookup is one module

**Status:** ready-for-agent
**Labels:** `enhancement`, `ready-for-agent`
**Blocked by:** None. Can start immediately.

## Observed

The pool name's country segment is read by `countryOf`, `flagOf` and `countryNameOf` under the web's egress view.
The mobile console needs the same rule: the pool name is `NN-CC-<slug>.conf`, the country is its second segment, the
flag is two regional indicators, and the name is `Intl.DisplayNames` in the current language. A copy in the mobile
view would make two owners of that rule.

## Expected

The three functions live in `@playliberty/ui-foundation` with their tests, and both clients import them. The web's
behavior is unchanged, and no client module owns the lookup.

## Evidence

`apps/web/src/views/egress/EgressPage/countryFlag/countryFlag.ts` and its test hold the only implementation. The
mobile console's card needs the same country word and flag.

## Acceptance criteria

- [ ] The shared module exports `countryOf`, `flagOf` and `countryNameOf`, with tests for the country segment, the
      flag and the localized name.
- [ ] The web Egress page imports the shared functions, and no copy remains under `apps/web`.
- [ ] The shared package's tests and the web tests pass.
- [ ] `pnpm run build` and `pnpm run lint:check` pass.

## Verification

`pnpm --filter @playliberty/ui-foundation test`, `pnpm --filter @playliberty/web test`, `pnpm run build` and
`pnpm run lint:check`.
