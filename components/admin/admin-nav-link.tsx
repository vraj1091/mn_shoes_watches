"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AdminNavLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-11 items-center gap-3 rounded-sm border-l-2 border-transparent px-3 text-sm whitespace-nowrap text-muted transition-colors hover:bg-surface hover:text-ink aria-[current=page]:border-accent aria-[current=page]:bg-surface aria-[current=page]:font-medium aria-[current=page]:text-ink"
    >
      {icon}
      {children}
    </Link>
  );
}
