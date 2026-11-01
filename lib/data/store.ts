import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { openingHoursSchema } from "@/lib/format/hours";

/*
 * Every public read goes through this pattern: `connection()` marks it as request-time, so the
 * build never needs the database, and the inner "use cache" function keeps the result until the
 * owner changes it (DECISIONS.md 23).
 */

const socialLinksSchema = z
  .object({
    instagram: z.url(),
    facebook: z.url(),
    youtube: z.url(),
    x: z.url(),
    googleBusinessProfile: z.url(),
  })
  .partial();
export type SocialLinks = z.infer<typeof socialLinksSchema>;

const trustStatsSchema = z.array(z.object({ label: z.string(), value: z.string() }));

async function loadSettings() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.settings);
  const settings = await prisma.storeSettings.findUnique({ where: { storeId: DEFAULT_STORE_ID } });
  if (!settings) throw new Error("Store settings are missing. Run `npm run db:seed` once to create them.");
  return {
    ...settings,
    socialLinks: socialLinksSchema.catch({}).parse(settings.socialLinks ?? {}),
    trustStats: trustStatsSchema.catch([]).parse(settings.trustStats ?? []),
  };
}

export type StoreSettings = Awaited<ReturnType<typeof loadSettings>>;

export async function getStoreSettings(): Promise<StoreSettings> {
  await connection();
  return loadSettings();
}

async function loadPrimaryLocation() {
  "use cache";
  cacheLife("max");
  cacheTag(tags.locations);
  const location = await prisma.storeLocation.findFirst({
    where: { storeId: DEFAULT_STORE_ID, isActive: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
  if (!location) return null;
  return { ...location, openingHours: openingHoursSchema.catch([]).parse(location.openingHours) };
}

export type StoreLocation = NonNullable<Awaited<ReturnType<typeof loadPrimaryLocation>>>;

export async function getPrimaryLocation(): Promise<StoreLocation | null> {
  await connection();
  return loadPrimaryLocation();
}
