/*
 * The exhaustiveness check a route uses in the default arm of a switch over an
 * outcome. It is typed to `never`, so the compiler refuses to compile the
 * default arm while any outcome case is unhandled, and it throws at runtime if a
 * value the types did not account for ever arrives.
 */
export function exhaust(value: never): never {
  throw new Error(`Check for ${value} is not exhaustive!`);
}
