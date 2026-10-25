"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { NavCategory } from "@/lib/data/navigation";

type Props = {
  departments: NavCategory[];
  extraLinks: { label: string; href: string; highlight?: boolean }[];
  label: string;
  shopAllTemplate: string;
  caret: ReactNode;
};

/**
 * Mega menu built as a disclosure navigation (WAI-ARIA pattern for site menus): each department
 * is a button that opens a panel of plain links. Opens on click, on Enter/Space, and on hover with
 * a short delay. Escape, a click outside and any page change close it. The panel sits on the
 * raised surface above a dimmed page, so nothing underneath shows through.
 */
export function DesktopNav({ departments, extraLinks, label, shopAllTemplate, caret }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const baseId = useId();

  // Close on any route change, including back/forward and links outside the menu.
  const pathname = usePathname();
  const [shownFor, setShownFor] = useState(pathname);
  if (pathname !== shownFor) {
    setShownFor(pathname);
    setOpenId(null);
  }

  useEffect(() => {
    if (!openId) return;
    const onPointer = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      document.getElementById(`${baseId}-btn-${openId}`)?.focus();
      setOpenId(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId, baseId]);

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const hoverOpen = (id: string | null) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setOpenId(id), id ? 120 : 200);
  };

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className="hidden lg:block"
      onPointerLeave={(event) => event.pointerType === "mouse" && hoverOpen(null)}
      onBlur={(event) => {
        if (!navRef.current?.contains(event.relatedTarget as Node)) setOpenId(null);
      }}
    >
      {openId && (
        // Dims the page under the panel. Clicking it closes the menu; so does the mouse moving onto it.
        <div
          aria-hidden
          className="absolute inset-x-0 top-full z-40 h-dvh bg-scrim/40"
          onClick={() => setOpenId(null)}
          onPointerEnter={(event) => event.pointerType === "mouse" && hoverOpen(null)}
        />
      )}
      <ul className="flex items-center gap-1">
        {departments.map((dept) => {
          const open = openId === dept.id;
          const panelId = `${baseId}-panel-${dept.id}`;
          return (
            <li key={dept.id} onPointerEnter={(event) => event.pointerType === "mouse" && hoverOpen(dept.id)}>
              <button
                id={`${baseId}-btn-${dept.id}`}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : dept.id)}
                className="group flex min-h-11 items-center gap-1 rounded-sm px-3 text-[0.9375rem] font-medium whitespace-nowrap text-ink transition-colors hover:text-link aria-expanded:text-link"
              >
                {dept.name}
                <span className="transition-transform duration-200 ease-out group-aria-expanded:rotate-180">{caret}</span>
              </button>
              <div
                id={panelId}
                hidden={!open}
                className="absolute inset-x-0 top-full z-50 border-y border-line bg-raised shadow-overlay"
              >
                <div className="mx-auto grid max-w-screen-xl grid-cols-[minmax(0,14rem)_1fr] gap-10 px-8 py-8">
                  <div className="border-r border-line pr-8">
                    <p className="text-lg font-semibold">{dept.name}</p>
                    <Link
                      href={dept.href}
                      onClick={() => setOpenId(null)}
                      className="mt-2 inline-block text-sm text-link underline decoration-1 underline-offset-4 hover:decoration-2"
                    >
                      {shopAllTemplate.replace("{name}", dept.name.toLowerCase())}
                    </Link>
                  </div>
                  <ul className="grid grid-cols-3 gap-x-8 gap-y-6 xl:grid-cols-4">
                    {dept.children.map((group) => (
                      <li key={group.id}>
                        <Link
                          href={group.href}
                          onClick={() => setOpenId(null)}
                          className="text-sm font-semibold text-ink hover:text-link"
                        >
                          {group.name}
                        </Link>
                        {group.children.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {group.children.map((leaf) => (
                              <li key={leaf.id}>
                                <Link
                                  href={leaf.href}
                                  onClick={() => setOpenId(null)}
                                  className="block py-0.5 text-sm text-muted hover:text-link"
                                >
                                  {leaf.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
        {extraLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`flex min-h-11 items-center rounded-sm px-3 text-[0.9375rem] font-medium whitespace-nowrap transition-colors hover:text-link ${
                link.highlight ? "text-sale" : "text-ink"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
