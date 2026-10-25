import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import { HomeIcon, ShieldIcon, StoreIcon } from "@/components/icons";
import { AdminNavLink } from "./admin-nav-link";
import { StaffSignOutButton } from "./staff-sign-out-button";
import { ThemeControl } from "@/components/theme/theme-control";

type NavItem = { href: string; label: string; icon: ReactNode; permission?: Permission };

// Grows phase by phase; only pages that exist are listed, so nothing here leads to a 404.
const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <HomeIcon size={20} />, permission: "dashboard.view" },
  { href: "/admin/account", label: "My account", icon: <ShieldIcon size={20} /> },
];

export async function AdminFrame({ children }: { children: ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/sign-in");
  const { user } = session;
  const items = NAV.filter((item) => !item.permission || can(user.role, item.permission));

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="border-b border-line bg-raised lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-5">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            MN admin
          </Link>
          <div className="flex items-center gap-1 lg:hidden">
            <Link href="/" className="flex min-h-11 items-center gap-2 px-2 text-sm text-muted hover:text-ink">
              <StoreIcon size={18} />
              Shop
            </Link>
            <ThemeControl />
            <StaffSignOutButton />
          </div>
        </div>
        <nav aria-label="Admin" className="overflow-x-auto px-2 pb-2 lg:flex-1 lg:px-3 lg:pb-0">
          <ul className="flex gap-1 lg:flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <AdminNavLink href={item.href} icon={item.icon}>
                  {item.label}
                </AdminNavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden border-t border-line p-4 lg:block">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <ThemeControl align="left" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <Link href="/" className="flex min-h-11 items-center gap-2 text-sm text-muted hover:text-ink">
              <StoreIcon size={18} />
              View shop
            </Link>
            <StaffSignOutButton />
          </div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function AdminPage({ title, intro, actions, children }: { title: string; intro?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">{title}</h1>
          {intro && <div className="mt-2 text-base text-muted">{intro}</div>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
