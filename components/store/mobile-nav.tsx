"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import type { NavCategory } from "@/lib/data/navigation";

type LinkItem = { label: string; href: string; highlight?: boolean; icon?: ReactNode };

type Props = {
  departments: NavCategory[];
  extraLinks: LinkItem[];
  accountLinks: LinkItem[];
  labels: { open: string; title: string; close: string; shopAll: string; searchLabel: string; searchPlaceholder: string };
  icons: { menu: ReactNode; close: ReactNode; caret: ReactNode; search: ReactNode };
};

const row = "flex min-h-13 w-full items-center justify-between gap-3 px-5 text-base text-fg";

/**
 * Phone menu: a drawer with large tap rows (Part 4, "Mobile"). Built on the browser's own modal
 * <dialog>, which traps focus, closes on Escape, makes the page behind it inert and returns
 * focus to the menu button, with no dialog library in the bundle.
 */
export function MobileNav({ departments, extraLinks, accountLinks, labels, icons }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  // The page behind the open drawer must not scroll (a CSS :has() rule would cost style work on every DOM change).
  const open = () => {
    document.documentElement.style.overflow = "hidden";
    dialog.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        aria-label={labels.open}
        aria-haspopup="dialog"
        onClick={open}
        className="-ml-2 flex size-11 items-center justify-center rounded-sm text-fg hover:bg-subtle lg:hidden"
      >
        {icons.menu}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="mobile-menu-title"
        // Fires for every way of closing: the button, a link, Escape or the backdrop.
        onClose={() => document.documentElement.style.removeProperty("overflow")}
        // A click on the backdrop lands on the <dialog> itself; clicks inside land on its content.
        onClick={(event) => event.target === event.currentTarget && close()}
        className="drawer-left m-0 h-dvh max-h-none w-[min(88vw,22rem)] max-w-none bg-canvas p-0 text-fg shadow-overlay backdrop:bg-scrim lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pr-2 pl-5">
            <h2 id="mobile-menu-title" className="font-display text-xl">
              {labels.title}
            </h2>
            <button
              type="button"
              aria-label={labels.close}
              onClick={close}
              className="flex size-11 items-center justify-center rounded-sm hover:bg-subtle"
            >
              {icons.close}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
            <form action="/search" role="search" className="p-4" onSubmit={close}>
              <label htmlFor="mobile-search" className="sr-only">
                {labels.searchLabel}
              </label>
              <div className="flex items-center gap-2 rounded-sm border border-line-strong px-3 focus-within:border-fg">
                <span className="text-muted">{icons.search}</span>
                <input
                  id="mobile-search"
                  name="q"
                  type="search"
                  enterKeyHint="search"
                  placeholder={labels.searchPlaceholder}
                  className="min-h-11 w-full bg-transparent text-base outline-none placeholder:text-muted"
                />
              </div>
            </form>

            <nav aria-label={labels.title}>
              <ul className="border-t border-line">
                {departments.map((dept) => (
                  <li key={dept.id} className="border-b border-line">
                    <details className="group">
                      <summary className={`${row} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                        {dept.name}
                        <span className="text-muted transition-transform duration-200 group-open:rotate-180">{icons.caret}</span>
                      </summary>
                      <ul className="pb-3">
                        <li>
                          <Link href={dept.href} onClick={close} className={`${row} min-h-11 text-accent`}>
                            {labels.shopAll.replace("{name}", dept.name.toLowerCase())}
                          </Link>
                        </li>
                        {dept.children.map((group) => (
                          <li key={group.id}>
                            {group.children.length > 0 ? (
                              <details className="group/sub">
                                <summary className={`${row} min-h-11 cursor-pointer list-none pl-8 [&::-webkit-details-marker]:hidden`}>
                                  {group.name}
                                  <span className="text-muted transition-transform duration-200 group-open/sub:rotate-180">
                                    {icons.caret}
                                  </span>
                                </summary>
                                <ul>
                                  <li>
                                    <Link href={group.href} onClick={close} className={`${row} min-h-11 pl-11 text-muted`}>
                                      {labels.shopAll.replace("{name}", group.name.toLowerCase())}
                                    </Link>
                                  </li>
                                  {group.children.map((leaf) => (
                                    <li key={leaf.id}>
                                      <Link href={leaf.href} onClick={close} className={`${row} min-h-11 pl-11 text-muted`}>
                                        {leaf.name}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            ) : (
                              <Link href={group.href} onClick={close} className={`${row} min-h-11 pl-8`}>
                                {group.name}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
                {extraLinks.map((link) => (
                  <li key={link.href} className="border-b border-line">
                    <Link href={link.href} onClick={close} className={`${row} ${link.highlight ? "text-accent" : ""}`}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <ul className="mt-6">
              {accountLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false} onClick={close} className={`${row} justify-start text-muted hover:text-fg`}>
                    {link.icon}
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </dialog>
    </>
  );
}
