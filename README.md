# PlayLiberty

Audio player for web and mobile that syncs YouTube playlists and keeps them saved, so you never lose a track to video deletion.

## Workspace layout

This repository is a pnpm workspaces monorepo. The components and the layer boundaries are owned by
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md), and the orientation and guardrails for an agent by
[`AGENTS.md`](AGENTS.md).

Tooling lives at the root: TypeScript, ESLint, Prettier with import sorting, Husky + lint-staged, dependency-cruiser, knip, and syncpack.

## Commands

- `pnpm install` - install all workspace dependencies.
- `pnpm run build` - build every workspace package in dependency order.
- `pnpm run lint` - lint the repository.
- `pnpm run format` - format the repository.
- `pnpm deploy:build-for-production` - build the production images, prepare the host directories, and ensure the Podman secrets. It does not install or start the service.
