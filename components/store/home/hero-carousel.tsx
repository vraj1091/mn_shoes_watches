"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { fill } from "@/lib/format/template";

/**
 * Hero banners as a swipeable row. It never moves by itself (moving content is hard to read and
 * fails WCAG 2.2.2 without a pause button); arrows and dots move it on demand.
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
    element.scrollTo({ left: target * element.clientWidth, behavior: "smooth" });
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
        <div className="mx-auto mt-4 flex max-w-screen-xl items-center justify-center gap-2 px-4 sm:px-6 lg:justify-end lg:px-8">
          <button type="button" aria-label={labels.previous} onClick={() => go(active - 1)} className="flex size-11 items-center justify-center rounded-full border border-line hover:bg-surface">
            {icons.previous}
          </button>
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={fill(labels.slide, { index: index + 1, count: slides.length })}
              aria-current={index === active}
              onClick={() => go(index)}
              className="flex size-11 items-center justify-center"
            >
              <span className={`block h-2 rounded-full transition-all ${index === active ? "w-6 bg-primary" : "w-2 bg-line-strong"}`} />
            </button>
          ))}
          <button type="button" aria-label={labels.next} onClick={() => go(active + 1)} className="flex size-11 items-center justify-center rounded-full border border-line hover:bg-surface">
            {icons.next}
          </button>
        </div>
      )}
    </div>
  );
}
