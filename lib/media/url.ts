/**
 * Public URL of an uploaded file. Local storage is served by app/media/[...key]; with an
 * S3-compatible store (R2, Bunny) MEDIA_PUBLIC_URL points at its public bucket address.
 */
export function mediaUrl(key: string): string {
  const base = process.env.MEDIA_PUBLIC_URL?.replace(/\/$/, "") ?? "/media";
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
