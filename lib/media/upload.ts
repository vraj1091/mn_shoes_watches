import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { uploadPath } from "./storage";
import { slugify } from "@/lib/catalog/listing";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_EDGE = 1600;
const ACCEPTED = new Set(["jpeg", "png", "webp", "avif", "gif", "heif", "tiff"]);
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

export class UploadError extends Error {}

/**
 * Stores one uploaded photo: checks it really is an image (from its bytes, not its name), turns it
 * upright, scales it down to at most 1600 px, saves it as WebP under DATA_DIR/uploads/YYYY/MM and
 * creates the Media record with a tiny blurred preview.
 */
export async function storeUploadedImage(file: File, { alt, staffId }: { alt: string; staffId: string }) {
  if (file.size === 0) throw new UploadError(`${file.name} is empty.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(`${file.name} is larger than 15 MB.`);
  const input = Buffer.from(await file.arrayBuffer());

  let format: string | undefined;
  try {
    format = (await sharp(input).metadata()).format;
  } catch {
    format = undefined;
  }
  if (!format || !ACCEPTED.has(format)) throw new UploadError(`${file.name} is not a photo the shop can use. Upload a JPG, PNG, WebP or AVIF file.`);

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  // The preview keeps transparency, so a cut-out photo previews on the tile of either theme.
  const blur = await sharp(data).resize(16, 16, { fit: "contain", background: TRANSPARENT }).webp({ quality: 40 }).toBuffer();

  const now = new Date();
  const base = slugify(file.name.replace(/\.[^.]+$/, "")).slice(0, 48) || "photo";
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${base}-${randomBytes(4).toString("hex")}.webp`;
  const target = uploadPath(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);

  return prisma.media.create({
    data: {
      storeId: DEFAULT_STORE_ID,
      kind: "IMAGE",
      source: "UPLOAD",
      storage: "LOCAL",
      key,
      mimeType: "image/webp",
      sizeBytes: data.length,
      width: info.width,
      height: info.height,
      alt: alt.slice(0, 200),
      blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
      checksum: createHash("sha256").update(input).digest("hex"),
      originalName: file.name.slice(0, 200),
      uploadedById: staffId,
    },
  });
}
