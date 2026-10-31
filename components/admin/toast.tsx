"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";

type Tone = "success" | "error";
type Toast = { id: number; message: string; tone: Tone };

type ShowToast = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ShowToast | null>(null);

/**
 * Shows a short message in the corner after a save; errors stay until closed, successes fade
 * after 5 seconds. Null outside the admin frame (the sign-in pages), where forms answer inline.
 */
export function useToast(): ShowToast | null {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);
  const show = useCallback(
    (message: string, tone: Tone = "success") => {
      const id = ++next.current;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      if (tone === "success") setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 print:hidden sm:left-auto sm:w-96">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-md border bg-raised px-4 py-3 text-sm shadow-overlay motion-safe:animate-fade-in ${
              toast.tone === "error" ? "border-error/50 text-error" : "border-success/50 text-success"
            }`}
          >
            <p className="flex-1 font-medium">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Close message" className="-m-2 grid size-9 shrink-0 place-items-center text-muted hover:text-ink">
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
