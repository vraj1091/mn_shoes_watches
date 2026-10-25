"use client";

import { useSyncExternalStore, type ReactNode } from "react";

type Theme = "system" | "light" | "dark";

const EVENT = "mn-themechange";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

const read = (): Theme => {
  const value = document.documentElement.dataset.theme;
  return value === "light" || value === "dark" ? value : "system";
};

function choose(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    // Private browsing can block storage; the choice still applies to this page.
  }
  if (theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(EVENT));
}

type Props = {
  legend: string;
  options: { value: Theme; label: string; icon: ReactNode }[];
};

/** Follows the phone's setting by default; a manual choice is remembered on this device (Part 3). */
export function ThemeSwitch({ legend, options }: Props) {
  const current = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted">{legend}</legend>
      <div className="inline-flex rounded-sm border border-line p-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-sm text-muted transition-colors has-checked:bg-subtle has-checked:text-fg has-focus-visible:outline-2 has-focus-visible:outline-accent"
          >
            <input
              type="radio"
              name="theme"
              value={option.value}
              checked={current === option.value}
              onChange={() => choose(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
