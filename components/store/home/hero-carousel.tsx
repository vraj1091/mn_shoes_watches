"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { scrollBehavior } from "@/lib/design/motion";
import { fill } from "@/lib/format/template";

/**
 * Hero banners as a swipeable row. It never moves by itself (moving content is hard to read and
 * fails WCAG 2.2.2 without a pause button); the arrows move it on demand, and a "01 / 03" counter
 * on a hairline says where you are.
 */
export function HeroCarousel({ slides, labels, icons }: { slides: ReactNode[]; labels: { previous: string; next: string; slide: string }; icons: { previous: ReactNode; next: ReactNode } }) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: element, threshold: [0.6] },
    );
    element.querySelectorAll("[data-index]").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, []);

  function go(index: number) {
    const element = track.current;
    if (!element) return;
    const target = (index + slides.length) % slides.length;
    element.scrollTo({ left: target * element.clientWidth, behavior: scrollBehavior() });
  }

  return (
    <div className="relative">
      <ul ref={track} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((slide, index) => (
          <li
            key={index}
            data-index={index}
            className="w-full shrink-0 snap-start"
            aria-roledescription="slide"
            aria-label={fill(labels.slide, { index: index + 1, count: slides.length })}
          >
            {slide}
          </li>
        ))}
      </ul>
      {slides.length > 1 && (
        <div className="mx-auto mt-6 flex max-w-screen-xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <span aria-hidden className="h-px flex-1 bg-line" />
          <button type="button" aria-label={labels.previous} onClick={() => go(active - 1)} className={arrow}>
            {icons.previous}
          </button>
          <p aria-live="polite" className="price min-w-14 text-center text-sm text-muted">
            <span aria-hidden>
              <span className="font-semibold text-ink">{pad(active + 1)}</span> / {pad(slides.length)}
            </span>
            <span className="sr-only">{fill(labels.slide, { index: active + 1, count: slides.length })}</span>
          </p>
          <button type="button" aria-label={labels.next} onClick={() => go(active + 1)} className={arrow}>
            {icons.next}
          </button>
        </div>
      )}
    </div>
  );
}

const arrow = "flex size-11 items-center justify-center rounded-sm border border-line text-ink transition-colors duration-150 hover:border-ink";

function pad(value: number) {
  return String(value).padStart(2, "0");
}
