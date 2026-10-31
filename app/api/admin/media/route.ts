import { revalidateTag } from "next/cache";
import { getStaffSession } from "@/lib/auth/session";
import { audit } from "@/lib/admin/audit";
import { can } from "@/lib/auth/permissions";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { tags } from "@/lib/cache/tags";
import { storeUploadedImage, UploadError } from "@/lib/media/upload";
import { mediaUrl } from "@/lib/media/url";

/**
 * Photo uploads from the admin (multipart: one or more "file" fields, optional "productId").
 * Uploading a real photo to a product that only had a generated placeholder replaces it.
 */
export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) return Response.json({ error: "Sign in again to upload photos." }, { status: 401 });
  if (!can(session.user.role, "media.manage") && !can(session.user.role, "catalogue.manage")) {
    return Response.json({ error: "Your role cannot upload photos." }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "The upload did not arrive in one piece. Try again." }, { status: 400 });
  }
  const files = form.getAll("file").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) return Response.json({ error: "Choose at least one photo." }, { status: 400 });
  if (files.length > 12) return Response.json({ error: "Upload up to 12 photos at a time." }, { status: 400 });

  const productId = typeof form.get("productId") === "string" ? String(form.get("productId")) : null;
  const product = productId
    ? await prisma.product.findFirst({ where: { id: productId, storeId: DEFAULT_STORE_ID }, select: { id: true, slug: true, title: true, isPlaceholderPhoto: true } })
    : null;
  if (productId && !product) return Response.json({ error: "This product no longer exists." }, { status: 404 });

  const uploaded: { id: string; url: string; alt: string; width: number | null; height: number | null }[] = [];
  const errors: string[] = [];
  for (const file of files) {
    try {
      const media = await storeUploadedImage(file, { alt: product?.title ?? file.name.replace(/\.[^.]+$/, ""), staffId: session.user.id });
      uploaded.push({ id: media.id, url: mediaUrl(media.key!), alt: media.alt ?? "", width: media.width, height: media.height });
    } catch (error) {
      if (error instanceof UploadError) errors.push(error.message);
      else throw error;
    }
  }

  if (product && uploaded.length > 0) {
    await prisma.$transaction(async (tx) => {
      if (product.isPlaceholderPhoto) {
        const placeholders = await tx.productMedia.findMany({ where: { productId: product.id }, select: { id: true, mediaId: true } });
        await tx.productMedia.deleteMany({ where: { id: { in: placeholders.map((entry) => entry.id) } } });
        await tx.product.update({ where: { id: product.id }, data: { isPlaceholderPhoto: false } });
        // The generated SVGs belong to the demo data; drop their records once nothing uses them.
        for (const { mediaId } of placeholders) {
          const used = await tx.productMedia.count({ where: { mediaId } });
          if (used === 0) await tx.media.deleteMany({ where: { id: mediaId, isDemo: true, mimeType: "image/svg+xml" } });
        }
      }
      const last = await tx.productMedia.aggregate({ where: { productId: product.id }, _max: { position: true } });
      let position = (last._max.position ?? -1) + 1;
      for (const media of uploaded) {
        await tx.productMedia.create({ data: { storeId: DEFAULT_STORE_ID, productId: product.id, mediaId: media.id, role: "GALLERY", position: position++ } });
      }
      await tx.product.update({ where: { id: product.id }, data: { contentUpdatedAt: new Date() } });
    });
    // Route handlers cannot use updateTag; expiring with expire: 0 has the same effect.
    revalidateTag(tags.products, { expire: 0 });
    revalidateTag(tags.product(product.slug), { expire: 0 });
  }
  if (uploaded.length > 0) {
    const count = uploaded.length === 1 ? "a photo" : `${uploaded.length} photos`;
    await audit(
      session.user.id,
      product ? "product.photos" : "media.upload",
      product ? { type: "product", id: product.id } : { type: "media", id: uploaded[0]!.id },
      product ? `Uploaded ${count} to “${product.title}”.` : `Uploaded ${count} to the photo library.`,
    );
  }

  return Response.json({ uploaded, errors }, { status: uploaded.length === 0 ? 400 : 200 });
}
