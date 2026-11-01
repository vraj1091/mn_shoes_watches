/**
 * Scroll behaviour for scrolls started from script. The reduced-motion rule in globals.css only
 * covers CSS animations and transitions; scrollTo({ behavior: "smooth" }) ignores it.
 */
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
