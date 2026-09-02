/**
 * Sends query parameters that are intentionally ahead of the generated API
 * snapshot so missing backend contract or handling is visible during joint debugging.
 */
export function asUncontractedQuery<T extends Record<string, unknown>>(
  query: T,
): never {
  return query as never;
}
