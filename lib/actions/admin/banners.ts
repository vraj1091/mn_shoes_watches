"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { requireStaff } from "@/lib/auth/session";
import { refreshStorefront } from "@/lib/admin/refresh";
import type { FormState } from "@/components/admin/forms";

/* Home page hero banners: a headline, a line of text, a button and one photo each. */

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const bannerSchema = z
  .object({
    title: z.string().trim().min(3, "Write a headline of at least 3 characters.").max(80, "Keep the headline under 80 characters."),
    subtitle: z.string().trim().max(200, "Keep the text under 200 characters."),
    ctaLabel: z.string().trim().max(30, "Keep the button text under 30 characters."),
    ctaHref: z.union([z.literal(""), z.string().regex(/^\/(?!\/)[^\s]*$|^https:\/\/[^\s]+$/, "The button link must be a shop address like /watches, or start with https://.")]),
    imageId: z.string().min(1, "Choose or upload a photo."),
    startsAt: z.union([z.literal(""), z.string().regex(DATE)]),
    endsAt: z.union([z.literal(""), z.string().regex(DATE)]),
    isActive: z.boolean(),
  })
  .superRefine((input, context) => {
    if (Boolean(input.ctaLabel) !== Boolean(input.ctaHref)) context.addIssue({ code: "custom", message: "Give the button both a text and a link, or leave both empty." });
    if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) context.addIssue({ code: "custom", message: "The end date is before the start date." });
  });

export async function saveBanner(id: string | null, _state: FormState, formData: FormData): Promise<FormState> {
  await requireStaff("content.manage");
  const parsed = bannerSchema.safeParse({
    title: text(formData, "title"),
    subtitle: text(formData, "subtitle"),
    ctaLabel: text(formData, "ctaLabel"),
    ctaHref: text(formData, "ctaHref"),
    imageId: text(formData, "imageId"),
    startsAt: text(formData, "startsAt"),
    endsAt: text(formData, "endsAt"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return { status: "error", message: "Please fix the following:", errors: parsed.error.issues.map((issue) => issue.message) };
  const input = parsed.data;
  const image = await prisma.media.findFirst({ where: { id: input.imageId, storeId: DEFAULT_STORE_ID, kind: "IMAGE" }, select: { id: true } });
  if (!image) return { status: "error", message: "That photo is no longer in the library. Choose another." };
  const data = {
    title: input.title,
    subtitle: input.subtitle || null,
    ctaLabel: input.ctaLabel || null,
    ctaHref: input.ctaHref || null,
    desktopImageId: image.id,
    startsAt: input.startsAt ? new Date(`${input.startsAt}T00:00:00+05:30`) : null,
    endsAt: input.endsAt ? new Date(`${input.endsAt}T23:59:59+05:30`) : null,
    isActive: input.isActive,
  };
  if (id) {
    const existing = await prisma.banner.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, select: { id: true } });
    if (!existing) return { status: "error", message: "This banner no longer exists." };
    await prisma.banner.update({ where: { id }, data });
    refreshStorefront("banners");
    return { status: "saved", message: "Saved. The home page shows it now." };
  }
  const last = await prisma.banner.aggregate({ where: { storeId: DEFAULT_STORE_ID, placement: "HOME_HERO" }, _max: { position: true } });
  await prisma.banner.create({ data: { storeId: DEFAULT_STORE_ID, placement: "HOME_HERO", position: (last._max.position ?? -1) + 1, ...data } });
  refreshStorefront("banners");
  redirect("/admin/banners?created=1");
}

export async function moveBanner(id: string, direction: -1 | 1) {
  await requireStaff("content.manage");
  const banners = await prisma.banner.findMany({ where: { storeId: DEFAULT_STORE_ID, placement: "HOME_HERO" }, orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const index = banners.findIndex((banner) => banner.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= banners.length) return { ok: false };
  [banners[index], banners[target]] = [banners[target]!, banners[index]!];
  await prisma.$transaction(banners.map((banner, position) => prisma.banner.update({ where: { id: banner.id }, data: { position } })));
  refreshStorefront("banners");
  return { ok: true };
}

export async function deleteBanner(id: string) {
  await requireStaff("content.manage");
  await prisma.banner.deleteMany({ where: { id, storeId: DEFAULT_STORE_ID } });
  refreshStorefront("banners");
  redirect("/admin/banners?deleted=1");
}
