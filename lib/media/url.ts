const encodePath = (key: string) => key.split("/").map(encodeURIComponent).join("/");

/**
 * Public URL of a stored file. Demo photos ship with the code in public/demo (keys start with
 * "demo/"). Uploads are served by app/media/[...key]; with an S3-compatible store (R2, Bunny)
 * MEDIA_PUBLIC_URL points at its public bucket address.
 */
export function mediaUrl(key: string): string {
  if (key.startsWith("demo/")) return `/${encodePath(key)}`;
  const base = process.env.MEDIA_PUBLIC_URL?.replace(/\/$/, "") ?? "/media";
  return `${base}/${encodePath(key)}`;
}
