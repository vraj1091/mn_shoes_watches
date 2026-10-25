/**
 * Only same-site paths may be used as a "next" destination after sign-in, so a crafted link
 * cannot send someone to another website (open redirect).
 */
export function safeNextPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
