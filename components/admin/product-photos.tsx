"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type DragEvent } from "react";
import { removeProductMedia, reorderProductMedia, updateMediaAlt } from "@/lib/actions/admin/products";
import { ArrowDownIcon, ArrowUpIcon, DragIcon, TrashIcon, UploadIcon, WarningIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

export type PhotoItem = { id: string; url: string; alt: string; isSvg: boolean };

/**
 * Product photos: drop or choose files to upload, drag (or use the arrow buttons) to change the
 * order, and describe each photo for screen readers. The first photo is the one on product cards.
 */
export function ProductPhotos({ productId, photos, placeholder }: { productId: string; photos: PhotoItem[]; placeholder: boolean }) {
  const router = useRouter();
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState(photos);
  const [previous, setPrevious] = useState(photos);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [, startTransition] = useTransition();

  // New photos from the server (after an upload or a save) replace the local order.
  if (previous !== photos) {
    setPrevious(photos);
    setItems(photos);
  }

  async function upload(files: FileList | File[]) {
    const list = [...files].filter((file) => file.type.startsWith("image/") || /\.(jpe?g|png|webp|avif|heic)$/i.test(file.name));
    if (list.length === 0) {
      setMessage({ tone: "error", text: "Choose JPG, PNG, WebP or AVIF photos." });
      return;
    }
    setMessage(null);
    setUploading(list.length);
    const body = new FormData();
    body.set("productId", productId);
    for (const file of list) body.append("file", file);
    try {
      const response = await fetch("/api/admin/media", { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as { uploaded?: unknown[]; errors?: string[]; error?: string };
      const count = result.uploaded?.length ?? 0;
      const problems = result.errors ?? (result.error ? [result.error] : []);
      if (count > 0) router.refresh();
      setMessage(
        problems.length
          ? { tone: "error", text: `${count ? `${count} uploaded. ` : ""}${problems.join(" ")}` }
          : { tone: "ok", text: `${count} ${count === 1 ? "photo" : "photos"} uploaded.` },
      );
    } catch {
      setMessage({ tone: "error", text: "The upload failed. Check your connection and try again." });
    } finally {
      setUploading(0);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function saveOrder(next: PhotoItem[]) {
    setItems(next);
    startTransition(async () => {
      const result = await reorderProductMedia(productId, next.map((item) => item.id));
      if (!result.ok) setMessage({ tone: "error", text: "The new order could not be saved. Reload the page and try again." });
      else router.refresh();
    });
  }

  function move(index: number, by: number) {
    const target = index + by;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    saveOrder(next);
  }

  function dropOn(targetId: string) {
    if (!dragging || dragging === targetId) return;
    const from = items.findIndex((item) => item.id === dragging);
    const to = items.findIndex((item) => item.id === targetId);
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setDragging(null);
    saveOrder(next);
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeProductMedia(productId, id);
      if (!result.ok) setMessage({ tone: "error", text: result.message ?? "The photo could not be removed." });
      else {
        setItems((current) => current.filter((item) => item.id !== id));
        router.refresh();
      }
    });
  }

  const onDropFiles = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setOver(false);
    if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
  };

  return (
    <div>
      {placeholder && (
        <div role="note" className="mb-4 flex gap-3 rounded-sm border border-sale/40 bg-surface p-3 text-sm">
          <WarningIcon size={20} className="mt-0.5 shrink-0 text-sale" />
          <p>
            <strong className="font-semibold">Replace photo.</strong> This product shows a generated placeholder image. Upload a real photo and the placeholder is
            removed.
          </p>
        </div>
      )}

      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDropFiles}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-6 text-center text-sm transition-colors ${over ? "border-ink bg-surface" : "border-line-strong hover:border-muted"}`}
      >
        <UploadIcon size={24} className="text-muted" />
        <span>
          <span className="font-semibold text-link underline underline-offset-4">Choose photos</span> or drop them here
        </span>
        <span className="text-xs text-muted">JPG, PNG, WebP or AVIF, up to 15 MB each. Shot on white looks best.</span>
        <input
          ref={fileInput}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => event.target.files && void upload(event.target.files)}
        />
      </label>

      <div aria-live="polite" className="mt-3 min-h-5 text-sm">
        {uploading > 0 && <p>Uploading {uploading === 1 ? "1 photo" : `${uploading} photos`}…</p>}
        {!uploading && message && <p className={message.tone === "error" ? "text-sale" : "text-stock"}>{message.text}</p>}
      </div>

      {items.length > 0 && (
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.id}
              draggable
              onDragStart={(event) => {
                setDragging(item.id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => {
                if (dragging) event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                dropOn(item.id);
              }}
              className={`rounded-md border bg-raised p-3 ${dragging === item.id ? "border-ink opacity-60" : "border-line"}`}
            >
              <div className="flex items-start gap-3">
                <div className="photo-tile relative size-24 shrink-0 overflow-hidden rounded-sm">
                  <Image src={item.url} alt="" fill sizes="96px" className={item.isSvg ? "object-cover mix-blend-normal" : "object-contain p-1"} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-xs font-semibold text-muted">
                    <DragIcon size={16} className="cursor-grab" />
                    {index === 0 ? "Main photo" : `Photo ${index + 1}`}
                  </p>
                  <div className="mt-2 flex gap-1">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className={buttonClasses("ghost", "sm", "px-2")} aria-label={`Move photo ${index + 1} earlier`}>
                      <ArrowUpIcon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      className={buttonClasses("ghost", "sm", "px-2")}
                      aria-label={`Move photo ${index + 1} later`}
                    >
                      <ArrowDownIcon size={16} />
                    </button>
                    <RemoveButton onConfirm={() => remove(item.id)} index={index} />
                  </div>
                </div>
              </div>
              <AltField productId={productId} item={item} index={index} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RemoveButton({ onConfirm, index }: { onConfirm: () => void; index: number }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={buttonClasses("ghost", "sm", "px-2 text-sale")} aria-label={`Remove photo ${index + 1}`}>
        <TrashIcon size={16} />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      <button type="button" onClick={onConfirm} className={buttonClasses("danger", "sm", "px-2")}>
        Remove
      </button>
      <button type="button" onClick={() => setAsking(false)} className={buttonClasses("ghost", "sm", "px-2")}>
        Keep
      </button>
    </span>
  );
}

function AltField({ productId, item, index }: { productId: string; item: PhotoItem; index: number }) {
  const [value, setValue] = useState(item.alt);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const id = useId();
  const save = () => {
    if (value.trim() === item.alt) return;
    startTransition(async () => {
      const result = await updateMediaAlt(productId, item.id, value);
      setStatus(result.message ?? null);
    });
  };
  return (
    <div className="mt-3">
      <label htmlFor={id} className="text-xs font-medium">
        Describe photo {index + 1}
      </label>
      <input
        id={id}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
        maxLength={200}
        className={`${inputClasses} mt-1 min-h-9 text-sm`}
      />
      <p aria-live="polite" className="mt-1 min-h-4 text-xs text-muted">
        {pending ? "Saving…" : status}
      </p>
    </div>
  );
}
