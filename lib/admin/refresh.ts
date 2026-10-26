import "server-only";
import { updateTag } from "next/cache";
import { tags } from "@/lib/cache/tags";

/**
 * Expires the storefront caches an admin change affects, so the shop shows it on the next request
 * (server actions only). The proxy's route list reloads by itself when the database changes.
 */
export function refreshStorefront(...names: (keyof typeof tags | `product:${string}`)[]) {
  for (const name of names) {
    if (name.startsWith("product:")) updateTag(name);
    else {
      const tag = tags[name as keyof typeof tags];
      if (typeof tag === "string") updateTag(tag);
    }
  }
}
