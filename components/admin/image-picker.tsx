"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { UploadIcon } from "@/components/icons";

export type PickableImage = { id: string; url: string; alt: string };

/**
 * Picks one photo for a banner: upload a new one, or reuse a product photo already in the shop.
 * The chosen photo's id goes into a hidden field named `name`.
 */
export function ImagePicker({ name, initial, library }: { name: string; initial: PickableImage | null; library: PickableImage[] }) {
  const [chosen, setChosen] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileId = useId();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { uploaded?: PickableImage[]; errors?: string[]; error?: string };
      const image = result.uploaded?.[0];
      if (image) setChosen(image);
      else setError(result.errors?.[0] ?? result.error ?? "The upload failed. Try again.");
    } catch {
      setError("The upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">Photo</legend>
      <input type="hidden" name={name} value={chosen?.id ?? ""} />
      <div className="flex flex-wrap items-start gap-4">
        <div className="photo-tile relative aspect-[16/11] w-56 shrink-0 overflow-hidden rounded-md">
          {chosen ? (
            <Image src={chosen.url} alt={chosen.alt} fill sizes="224px" className={chosen.url.endsWith(".svg") ? "object-cover mix-blend-normal" : "object-contain p-3"} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-muted">No photo yet</span>
          )}
        </div>
        <div className="grid gap-2 text-sm">
          <label htmlFor={fileId} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-line px-4 font-medium hover:border-line-strong hover:bg-surface">
            <UploadIcon size={18} />
            {busy ? "Uploading…" : "Upload a photo"}
            <input
              id={fileId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
          </label>
          <p className="max-w-xs text-xs text-muted">A product shot on white works best; it sits beside the headline. Up to 15 MB.</p>
          {error && (
            <p role="alert" className="text-error">
              {error}
            </p>
          )}
        </div>
      </div>
      {library.length > 0 && (
        <details className="mt-4 rounded-sm border border-line">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Or choose a product photo</summary>
          <ul className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto border-t border-line p-3 sm:grid-cols-5 lg:grid-cols-6">
            {library.map((image) => (
              <li key={image.id}>
                <button
                  type="button"
                  onClick={() => setChosen(image)}
                  aria-pressed={chosen?.id === image.id}
                  aria-label={`Use ${image.alt}`}
                  className="photo-tile relative block aspect-square w-full overflow-hidden rounded-sm border-2 border-transparent aria-pressed:border-ink"
                >
                  <Image src={image.url} alt="" fill sizes="120px" className={image.url.endsWith(".svg") ? "object-cover mix-blend-normal" : "object-contain p-1"} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </fieldset>
  );
}
