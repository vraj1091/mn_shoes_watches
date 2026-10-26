"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { fill } from "@/lib/format/template";

export type GalleryImage = { url: string; alt: string; width: number; height: number; blurDataUrl: string | null };
export type GalleryLabels = { viewer: string; open: string; close: string; previous: string; next: string; thumb: string; zoomHint: string; video: string };

const isVector = (url: string) => url.endsWith(".svg");

/**
 * Product photos: the main photo zooms where the pointer is on desktop; a click (or tap) opens a
 * full-screen viewer with arrows, thumbnails, a click-to-zoom photo and the product video.
 */
export function Gallery({ images, videoEmbed, labels, icons }: { images: GalleryImage[]; videoEmbed: string | null; labels: GalleryLabels; icons: { close: ReactNode; previous: ReactNode; next: ReactNode; play: ReactNode } }) {
  const [active, setActive] = useState(0);
  const [origin, setOrigin] = useState("50% 50%");
  const [hovering, setHovering] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const slides = images.length + (videoEmbed ? 1 : 0);
  const image = images[active]!;

  function openViewer(index: number) {
    setViewer(index);
    setZoomed(false);
    dialog.current?.showModal();
  }

  function move(step: number) {
    setViewer((current) => (current === null ? 0 : (current + step + slides) % slides));
    setZoomed(false);
  }

  function onPointerMove(event: MouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setOrigin(`${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`);
  }

  function onViewerKey(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "ArrowRight") move(1);
    if (event.key === "ArrowLeft") move(-1);
  }

  const vector = isVector(image.url);

  return (
    <div>
      <button
        type="button"
        onClick={() => openViewer(active)}
        onMouseMove={onPointerMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-label={fill(labels.open, { index: active + 1, count: images.length })}
        title={vector ? undefined : labels.zoomHint}
        className="photo-tile relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-md"
      >
        <Image
          key={image.url}
          src={image.url}
          alt={image.alt}
          fill
          sizes="(min-width: 1024px) 55vw, 92vw"
          preload={active === 0}
          placeholder={image.blurDataUrl ? "blur" : "empty"}
          blurDataURL={image.blurDataUrl ?? undefined}
          style={{ transformOrigin: origin }}
          className={`transition-transform duration-200 ${vector ? "object-cover mix-blend-normal" : "object-contain p-[4%]"} ${hovering && !vector ? "lg:scale-[1.8]" : ""}`}
        />
      </button>

      {slides > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((thumb, index) => (
            <li key={thumb.url} className="shrink-0">
              <button
                type="button"
                aria-label={fill(labels.thumb, { index: index + 1 })}
                aria-current={index === active}
                onClick={() => setActive(index)}
                className="photo-tile relative block size-16 overflow-hidden rounded-sm border-2 border-transparent aria-current:border-primary sm:size-20"
              >
                <Image src={thumb.url} alt="" fill sizes="80px" className={isVector(thumb.url) ? "object-cover mix-blend-normal" : "object-contain p-1"} />
              </button>
            </li>
          ))}
          {videoEmbed && (
            <li className="shrink-0">
              <button
                type="button"
                aria-label={labels.video}
                onClick={() => openViewer(images.length)}
                className="flex size-16 items-center justify-center rounded-sm border border-line text-ink hover:bg-surface sm:size-20"
              >
                {icons.play}
              </button>
            </li>
          )}
        </ul>
      )}

      <dialog
        ref={dialog}
        aria-label={labels.viewer}
        onKeyDown={onViewerKey}
        onClose={() => setViewer(null)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-raised p-0 text-ink backdrop:bg-scrim"
      >
        {viewer !== null && (
          <div className="flex h-full flex-col">
            <div className="flex h-14 shrink-0 items-center justify-between px-2">
              <p className="px-3 text-sm text-muted tabular-nums">
                {viewer + 1} / {slides}
              </p>
              <button type="button" aria-label={labels.close} onClick={() => dialog.current?.close()} className="flex size-11 items-center justify-center rounded-sm hover:bg-surface">
                {icons.close}
              </button>
            </div>
            <div className="relative flex-1 overflow-hidden">
              {viewer < images.length ? (
                <button
                  type="button"
                  onClick={(event) => {
                    const box = event.currentTarget.getBoundingClientRect();
                    setOrigin(`${((event.clientX - box.left) / box.width) * 100}% ${((event.clientY - box.top) / box.height) * 100}%`);
                    setZoomed((value) => !value);
                  }}
                  className={`photo-tile absolute inset-0 overflow-hidden ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                  aria-label={images[viewer]!.alt}
                >
                  <Image
                    src={images[viewer]!.url}
                    alt={images[viewer]!.alt}
                    fill
                    sizes="100vw"
                    style={{ transformOrigin: origin }}
                    className={`transition-transform duration-200 ${isVector(images[viewer]!.url) ? "object-contain mix-blend-normal" : "object-contain p-4"} ${zoomed ? "scale-[2.2]" : ""}`}
                  />
                </button>
              ) : (
                <iframe
                  src={videoEmbed!}
                  title={labels.video}
                  loading="lazy"
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  className="absolute inset-0 size-full"
                />
              )}
              {slides > 1 && (
                <>
                  <button type="button" aria-label={labels.previous} onClick={() => move(-1)} className="absolute top-1/2 left-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-raised shadow-overlay">
                    {icons.previous}
                  </button>
                  <button type="button" aria-label={labels.next} onClick={() => move(1)} className="absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-raised shadow-overlay">
                    {icons.next}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
