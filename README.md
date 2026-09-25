# PlayLiberty

Audio player for web and mobile that syncs YouTube playlists and keeps them saved, so you never lose a track to video deletion.

## Workspace layout

This repository is a pnpm workspaces monorepo.

- `apps/console` - runnable Node application, the current entry point while the player surface is built.
- `packages/utils` - shared utility library (paths, collections, functions, async helpers).

Tooling lives at the root: TypeScript, ESLint, Prettier with import sorting, Husky + lint-staged, dependency-cruiser, knip, and syncpack.

## Commands

- `pnpm install` - install all workspace dependencies.
- `pnpm run build` - build every workspace package in dependency order.
- `pnpm run console:start` - run the console app.
- `pnpm run lint` - lint the repository.
- `pnpm run format` - format the repository.
