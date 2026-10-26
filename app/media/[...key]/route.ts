import { readFile } from "node:fs/promises";
import { uploadPath } from "@/lib/media/upload";

const TYPES: Record<string, string> = {
  webp: "image/webp",
  avif: "image/avif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
};

/**
 * Serves uploaded files from DATA_DIR/uploads. Each upload gets a new random name, so a file at a
 * given address never changes and browsers may keep it for a year.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  if (key.length === 0 || key.some((part) => !/^[a-z0-9][a-z0-9._-]*$/i.test(part) || part.includes(".."))) {
    return new Response("Not found", { status: 404 });
  }
  const type = TYPES[key.at(-1)!.split(".").pop()!.toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(uploadPath(key.join("/")));
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        ...(type === "image/svg+xml" ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
