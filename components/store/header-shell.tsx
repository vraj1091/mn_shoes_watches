"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Sticky header that tightens once the page scrolls (Part 4: "Header shrinks on scroll"). */
export function HeaderShell({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="group/header sticky top-0 z-40 border-b border-line bg-canvas transition-[box-shadow] duration-200 data-scrolled:shadow-[0_1px_0_0_var(--line)]"
    >
      {children}
    </header>
  );
}
