import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/auth/session";
import { can, ROLE_LABELS, type Permission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { hasDemoData } from "@/lib/demo/remove";
import {
  HomeIcon,
  ImageIcon,
  PackageIcon,
  ReceiptIcon,
  SettingsIcon,
  ShieldIcon,
  StoreIcon,
  TagIcon,
  TicketIcon,
  TreeIcon,
  UsersIcon,
} from "@/components/icons";
import { AdminNavLink } from "./admin-nav-link";
import { StaffSignOutButton } from "./staff-sign-out-button";
import { ThemeControl } from "@/components/theme/theme-control";

type NavItem = { href: string; label: string; icon: ReactNode; permission?: Permission };

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: <HomeIcon size={20} />, permission: "dashboard.view" },
  { href: "/admin/orders", label: "Orders", icon: <ReceiptIcon size={20} />, permission: "orders.view" },
  { href: "/admin/products", label: "Products", icon: <PackageIcon size={20} />, permission: "catalogue.view" },
  { href: "/admin/categories", label: "Categories", icon: <TreeIcon size={20} />, permission: "catalogue.manage" },
  { href: "/admin/brands", label: "Brands", icon: <TagIcon size={20} />, permission: "catalogue.manage" },
  { href: "/admin/coupons", label: "Coupons", icon: <TicketIcon size={20} />, permission: "discounts.manage" },
  { href: "/admin/customers", label: "Customers", icon: <UsersIcon size={20} />, permission: "customers.view" },
  { href: "/admin/banners", label: "Home banners", icon: <ImageIcon size={20} />, permission: "content.manage" },
  { href: "/admin/settings", label: "Settings", icon: <SettingsIcon size={20} />, permission: "settings.manage" },
  { href: "/admin/account", label: "My account", icon: <ShieldIcon size={20} /> },
];

export async function AdminFrame({ children }: { children: ReactNode }) {
  const session = await getStaffSession();
  if (!session) redirect("/admin/sign-in");
  const { user } = session;
  const items = NAV.filter((item) => !item.permission || can(user.role, item.permission));
  const demo = await hasDemoData(prisma);

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[15rem_1fr] print:block print:bg-canvas">
      <aside className="border-b border-line bg-raised print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0">
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
        <nav aria-label="Admin" className="overflow-x-auto px-2 pb-2 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:pb-0">
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
      <div className="min-w-0">
        {demo && (
          <div role="note" className="border-b border-line bg-badge print:hidden px-4 py-2.5 text-sm text-badge-ink sm:px-6 lg:px-10">
            <strong>Demo data is live.</strong> Products, brands, photos and orders marked as demo (including real brand names such as
            Rolex and Chanel) are for trying the shop only.{" "}
            {can(user.role, "settings.manage") && (
              <Link href="/admin/settings#demo-data" className="font-semibold underline underline-offset-2">
                Remove it in Settings before going live.
              </Link>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export function AdminPage({ title, intro, actions, children, wide = false }: { title: string; intro?: ReactNode; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`mx-auto px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
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
