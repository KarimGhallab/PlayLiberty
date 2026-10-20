/* The exhaustiveness check: typed to `never`, so unhandled outcome will not
 * compile, and it throws if an unaccounted value arrives at runtime. */
export function exhaust(value: never): never {
  throw new Error(`Check for ${value} is not exhaustive!`);
}
