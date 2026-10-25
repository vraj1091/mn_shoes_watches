/**
 * Full page load after signing in or out. Pages the router prefetched belong to the previous
 * session (a prefetched /account still says "sign in first"), and a soft navigation would reuse
 * them. A real load starts clean.
 */
export function reloadTo(path: string): void {
  window.location.assign(path);
}
