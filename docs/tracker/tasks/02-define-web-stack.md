# Define the web client stack

Status: resolved
Labels: `enhancement`

## Outcome

The stack is recorded in [`The web stack`](../../ARCHITECTURE.md#the-web-stack): React 19 with the React Compiler, Vite 8, TypeScript 6, TanStack Router and Query, Zustand 5, SCSS with CSS Modules over the token stylesheet, one global audio element with the Media Session API, `localStorage` persistence, and Vitest with RTL, jsdom and MSW. The client is served by a dedicated nginx container as the single public origin; the CSRF defense is [`Mutating requests carry a client header and pass origin checks`](../../ARCHITECTURE.md#mutating-requests-carry-a-client-header-and-pass-origin-checks). The skeleton landed in [`05-scaffold-web`](05-scaffold-web.md).

## Verification

[`The web stack`](../../ARCHITECTURE.md#the-web-stack) records the stack and the rejected alternatives; the skeleton passes build, lint, depcruise and syncpack.
