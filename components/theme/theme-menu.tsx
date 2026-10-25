"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { useTheme } from "next-themes";

type Choice = "light" | "dark" | "system";
const CHOICES: Choice[] = ["light", "dark", "system"];

export type ThemeMenuLabels = { button: string } & Record<Choice, string>;

const subscribeNothing = () => () => {};

/** The same three choices as a row of radio buttons, for the phone menu drawer. */
export function ThemeChoices({ labels, icons }: { labels: ThemeMenuLabels; icons: Record<Choice, ReactNode> }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const current: Choice = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{labels.button}</legend>
      <div className="grid grid-cols-3 rounded-sm border border-line p-0.5">
        {CHOICES.map((choice) => (
          <label
            key={choice}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm text-sm text-muted transition-colors has-checked:bg-surface has-checked:font-medium has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-link"
          >
            <input type="radio" name="theme-choice" value={choice} checked={current === choice} onChange={() => setTheme(choice)} className="sr-only" />
            <span aria-hidden>{icons[choice]}</span>
            {labels[choice]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Light / dark / system as a small menu (WAI-ARIA menu button with radio items). Before hydration the
 * button shows the "system" icon, because the saved choice is only known in the browser.
 */
export function ThemeMenu({ labels, icons, align = "right" }: { labels: ThemeMenuLabels; icons: Record<Choice, ReactNode>; align?: "left" | "right" }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const current: Choice = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current[CHOICES.indexOf(current)]?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
    // Focus moves into the menu only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = itemRefs.current.findIndex((item) => item === document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = (index + (event.key === "ArrowDown" ? 1 : -1) + CHOICES.length) % CHOICES.length;
      itemRefs.current[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      itemRefs.current[event.key === "Home" ? 0 : CHOICES.length - 1]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${labels.button}: ${labels[current]}`}
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-surface"
      >
        {icons[current]}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={labels.button}
          onKeyDown={onMenuKey}
          className={`absolute top-full z-50 mt-2 w-44 rounded-md border border-line bg-raised p-1 shadow-overlay ${align === "right" ? "right-0" : "left-0"}`}
        >
          {CHOICES.map((choice, index) => (
            <button
              key={choice}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={current === choice}
              tabIndex={current === choice ? 0 : -1}
              onClick={() => {
                setTheme(choice);
                close();
              }}
              className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm text-ink hover:bg-surface aria-checked:font-semibold"
            >
              <span aria-hidden>{icons[choice]}</span>
              <span className="flex-1">{labels[choice]}</span>
              {current === choice && <span aria-hidden className="size-1.5 rounded-full bg-link" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
