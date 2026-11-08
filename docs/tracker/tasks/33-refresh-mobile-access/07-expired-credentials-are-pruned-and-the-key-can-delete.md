# 07: Expired credentials are pruned and the key can delete

**Status:** resolved
**Labels:** `enhancement`, `ready-for-agent`

## Outcome

The prune service gained a credential sweep. It deletes expiry-passed refresh tokens, then access tokens, then
families, in one transaction, so the counts are the rows themselves rather than a family cascade. Expiry is the
criterion: a revoked family whose cap has not passed stays until it does. The sweep takes the injected clock, returns
its three counts and writes one `credential prune finished` line with them.

The weekly scheduler runs it after the orphan and cover sweeps, using the same injected clock, so an instance reaches
it on its normal prune tick.

The deployment notes now record the operator side: the Integration API key needs the create **and** delete actions,
because sign-out and reuse end tokens at the edge, and the three credential lifetimes are server configuration with
their defaults. Nothing is added to the build: the deployment script still stores the secret and makes no Pangolin
call.

See [`33-refresh-mobile-access`](../../specs/33-refresh-mobile-access.md).
