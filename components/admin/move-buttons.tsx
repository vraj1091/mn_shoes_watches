"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";

/** Up / down buttons for ordering a list (categories, banners). */
export function MoveButtons({ move, label, first, last }: { move: (direction: -1 | 1) => Promise<{ ok: boolean }>; label: string; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (direction: -1 | 1) =>
    startTransition(async () => {
      await move(direction);
      router.refresh();
    });
  return (
    <span className="inline-flex">
      <button type="button" onClick={() => go(-1)} disabled={first || pending} aria-label={`Move ${label} up`} className={buttonClasses("ghost", "sm", "px-2")}>
        <ArrowUpIcon size={16} />
      </button>
      <button type="button" onClick={() => go(1)} disabled={last || pending} aria-label={`Move ${label} down`} className={buttonClasses("ghost", "sm", "px-2")}>
        <ArrowDownIcon size={16} />
      </button>
    </span>
  );
}
