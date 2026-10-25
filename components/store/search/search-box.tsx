"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { Suggestions } from "@/lib/search/types";
import { fill } from "@/lib/format/template";

const RECENT_KEY = "mn-recent-searches";
const MAX_RECENT = 6;

function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(items: string[]): void {
  try {
    if (items.length) localStorage.setItem(RECENT_KEY, JSON.stringify(items));
    else localStorage.removeItem(RECENT_KEY);
  } catch {
    // Storage can be blocked (private browsing); search still works.
  }
}

function rememberSearch(query: string): void {
  writeRecent([query, ...readRecent().filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, MAX_RECENT));
}

export type SearchLabels = {
  label: string;
  placeholder: string;
  submit: string;
  products: string;
  categories: string;
  recent: string;
  clearRecent: string;
  viewAll: string;
  noSuggestions: string;
  didYouMean: string;
};

type Option = { id: string; href: string; remember?: string; content: ReactNode };
type Section = { key: string; label: string; options: Option[] };

const sectionLabel = "px-4 pt-2 pb-1 text-xs font-semibold tracking-[0.12em] text-muted uppercase";

/**
 * Search with instant suggestions (WAI-ARIA combobox with grouped listbox). Without JavaScript
 * it is a plain GET form to /search. Suggestions start at two characters; recent searches stay
 * on this device only.
 */
export function SearchBox({
  labels,
  defaultValue = "",
  autoFocus = false,
  size = "page",
  icon,
}: {
  labels: SearchLabels;
  defaultValue?: string;
  autoFocus?: boolean;
  size?: "header" | "page";
  icon: ReactNode;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const baseId = useId();
  const listId = `${baseId}-list`;
  const container = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();
  const typing = trimmed.length >= 2;

  useEffect(() => {
    if (!typing) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (response.ok) setSuggestions((await response.json()) as Suggestions);
      } catch {
        // Aborted by the next keystroke, or offline: keep the previous suggestions.
      }
    }, 150);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, typing]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const sections: Section[] = [];
  const data = typing ? suggestions : null;
  if (data) {
    if (data.products.length) {
      sections.push({
        key: "products",
        label: labels.products,
        options: data.products.map((product, i) => ({
          id: `${baseId}-p${i}`,
          href: product.href,
          content: (
            <span className="flex items-center gap-3">
              <span className="size-12 shrink-0 overflow-hidden rounded-sm bg-subtle">
                {product.image && <img src={product.image} alt="" width={48} height={48} className="size-full object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-fg">{product.title}</span>
                <span className="block text-sm text-muted tabular-nums">{product.price}</span>
              </span>
            </span>
          ),
        })),
      });
    }
    if (data.categories.length) {
      sections.push({
        key: "categories",
        label: labels.categories,
        options: data.categories.map((category, i) => ({
          id: `${baseId}-c${i}`,
          href: category.href,
          content: (
            <span className="text-sm">
              <span className="text-fg">{category.name}</span>
              {category.context && <span className="text-muted"> · {category.context}</span>}
            </span>
          ),
        })),
      });
    }
    sections.push({
      key: "all",
      label: labels.label,
      options: [
        {
          id: `${baseId}-all`,
          href: `/search?q=${encodeURIComponent(trimmed)}`,
          remember: trimmed,
          content: <span className="text-sm font-medium text-accent">{fill(labels.viewAll, { q: trimmed })}</span>,
        },
      ],
    });
  } else if (!typing && recent.length) {
    sections.push({
      key: "recent",
      label: labels.recent,
      options: recent.map((item, i) => ({
        id: `${baseId}-r${i}`,
        href: `/search?q=${encodeURIComponent(item)}`,
        remember: item,
        content: <span className="text-sm text-fg">{item}</span>,
      })),
    });
  }

  const options = sections.flatMap((section) => section.options);
  const showPopup = open && (options.length > 0 || (typing && suggestions !== null));

  function go(option: { href: string; remember?: string }) {
    if (option.remember) rememberSearch(option.remember);
    setOpen(false);
    setActive(-1);
    router.push(option.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current) => (current + step + options.length) % options.length);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && active >= 0 && options[active]) {
      event.preventDefault();
      go(options[active]);
    }
  }

  return (
    <div ref={container} className="relative w-full">
      <form
        action="/search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed) go({ href: `/search?q=${encodeURIComponent(trimmed)}`, remember: trimmed });
        }}
      >
        <label htmlFor={`${baseId}-input`} className="sr-only">
          {labels.label}
        </label>
        <div
          className={`flex items-center gap-2 rounded-sm border bg-canvas px-3 transition-colors focus-within:border-fg ${
            size === "header" ? "border-line hover:border-line-strong" : "border-line-strong"
          }`}
        >
          <span className="shrink-0 text-muted">{icon}</span>
          <input
            id={`${baseId}-input`}
            name="q"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showPopup}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
            autoComplete="off"
            enterKeyHint="search"
            autoFocus={autoFocus}
            placeholder={labels.placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(-1);
              setOpen(true);
            }}
            onFocus={() => {
              setRecent(readRecent());
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={
              size === "header"
                ? "min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted"
                : "min-h-12 w-full bg-transparent text-base outline-none placeholder:text-muted"
            }
          />
          {size === "page" && (
            <button type="submit" className="min-h-10 shrink-0 rounded-sm bg-primary px-4 text-sm font-medium text-on-primary hover:bg-primary-hover">
              {labels.submit}
            </button>
          )}
        </div>
      </form>

      <div
        hidden={!showPopup}
        className={`absolute top-full right-0 z-50 mt-1 max-h-[70dvh] w-full overflow-y-auto rounded-md border border-line bg-canvas py-2 shadow-overlay ${
          size === "header" ? "min-w-80" : ""
        }`}
      >
        {data?.corrected && <p className="px-4 pb-2 text-sm text-muted">{fill(labels.didYouMean, { suggestion: data.corrected })}</p>}
        <div id={listId} role="listbox" aria-label={labels.label}>
          {sections.map((section) => (
            <div key={section.key} role="group" aria-labelledby={`${baseId}-${section.key}`}>
              {section.key === "all" ? (
                <span id={`${baseId}-${section.key}`} className="sr-only">
                  {section.label}
                </span>
              ) : (
                <div className="flex items-center justify-between">
                  <p id={`${baseId}-${section.key}`} className={sectionLabel}>
                    {section.label}
                  </p>
                  {section.key === "recent" && (
                    <button
                      type="button"
                      onClick={() => {
                        writeRecent([]);
                        setRecent([]);
                      }}
                      className="mr-3 min-h-9 px-1 text-xs text-muted underline underline-offset-4 hover:text-fg"
                    >
                      {labels.clearRecent}
                    </button>
                  )}
                </div>
              )}
              {section.options.map((option) => {
                const position = options.indexOf(option);
                return (
                  <a
                    key={option.id}
                    id={option.id}
                    role="option"
                    aria-selected={position === active}
                    href={option.href}
                    onClick={(event) => {
                      event.preventDefault();
                      go(option);
                    }}
                    onPointerEnter={() => setActive(position)}
                    className={`block px-4 py-2 aria-selected:bg-subtle ${section.key === "all" ? "mt-1 border-t border-line pt-3" : ""}`}
                  >
                    {option.content}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
        {data && data.products.length === 0 && data.categories.length === 0 && (
          <p className="px-4 py-2 text-sm text-muted">{labels.noSuggestions}</p>
        )}
      </div>
    </div>
  );
}
