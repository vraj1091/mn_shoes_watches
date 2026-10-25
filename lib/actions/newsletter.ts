"use server";

import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { clientIp } from "@/lib/security/request";
import { rateLimit } from "@/lib/security/rate-limit";

export type NewsletterState = { status: "idle" | "done" | "invalid" | "busy" | "error" };

const emailSchema = z.email().max(191);

export async function subscribeToNewsletter(_previous: NewsletterState, formData: FormData): Promise<NewsletterState> {
  // Bots fill every field; people never see this one.
  if (String(formData.get("company") ?? "") !== "") return { status: "done" };

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "invalid" };

  const limit = await rateLimit(`newsletter:${await clientIp()}`, { windowSeconds: 60, max: 5 });
  if (!limit.ok) return { status: "busy" };

  try {
    await prisma.newsletterSubscriber.upsert({
      where: { storeId_email: { storeId: DEFAULT_STORE_ID, email: parsed.data } },
      create: { email: parsed.data, source: "footer" },
      update: { status: "SUBSCRIBED", unsubscribedAt: null, consentedAt: new Date() },
    });
    return { status: "done" };
  } catch (error) {
    console.error("[newsletter] subscribe failed", error);
    return { status: "error" };
  }
}
