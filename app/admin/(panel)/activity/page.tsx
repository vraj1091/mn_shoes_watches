import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { formatDateTime } from "@/lib/format/date";
import { formatPriceExact } from "@/lib/format/money";
import { AdminPage } from "@/components/admin/admin-frame";
import { EmptyState, Pager, Select, Table, td, th } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Activity" };

const PAGE_SIZE = 50;

const AREAS: Record<string, { label: string; href?: (id: string) => string }> = {
  order: { label: "Orders", href: (id) => `/admin/orders/${id}` },
  product: { label: "Products", href: (id) => `/admin/products/${id}` },
  category: { label: "Categories", href: (id) => `/admin/categories/${id}` },
  brand: { label: "Brands", href: (id) => `/admin/brands/${id}` },
  coupon: { label: "Coupons", href: (id) => `/admin/coupons/${id}` },
  customer: { label: "Customers", href: (id) => `/admin/customers/${id}` },
  banner: { label: "Home banners", href: (id) => `/admin/banners/${id}` },
  media: { label: "Photo library" },
  settings: { label: "Settings" },
  staff: { label: "Staff", href: () => "/admin/staff" },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

// Settings and coupons store money in paise; these fields are shown in rupees.
const MONEY = /(^|\s)(price|codFee|codMinOrder|codMaxOrder|freeShippingThreshold|maxDiscount|minOrderValue)$/;

/** "codMinOrder" → "cod min order". */
const fieldName = (field: string) => field.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

function show(value: unknown, field: string): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "number" && MONEY.test(field)) return formatPriceExact(value);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "string") return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  return JSON.stringify(value).slice(0, 120);
}

/** Who changed what, and when (DECISIONS.md 69). Owner only. */
export default async function ActivityPage({ searchParams }: Props) {
  await requireStaff("activity.view");
  const params = await searchParams;
  const person = one(params.person);
  const area = one(params.area);
  const page = Math.max(1, Number(one(params.page)) || 1);
  const where = { storeId: DEFAULT_STORE_ID, ...(person ? { staffId: person } : {}), ...(area ? { entityType: area } : {}) };

  const [entries, total, staff] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { staff: { select: { name: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.staffUser.findMany({ where: { storeId: DEFAULT_STORE_ID }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (target: number) => {
    const query = new URLSearchParams({ ...(person && { person }), ...(area && { area }), ...(target > 1 && { page: String(target) }) });
    return query.size ? `/admin/activity?${query}` : "/admin/activity";
  };

  return (
    <AdminPage title="Activity" intro="Every change made in the admin: who, what and when. Kept for as long as the shop runs." wide>
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Person</span>
          <Select name="person" defaultValue={person} className="w-auto min-w-48">
            <option value="">Everyone</option>
            {staff.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium">Area</span>
          <Select name="area" defaultValue={area} className="w-auto min-w-48">
            <option value="">Everything</option>
            {Object.entries(AREAS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Show
        </button>
        {(person || area) && (
          <Link href="/admin/activity" className="inline-flex min-h-11 items-center text-sm text-link hover:text-accent underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      {entries.length === 0 ? (
        <EmptyState>{person || area ? "Nothing matches these filters." : "Nothing has been changed in the admin yet. Saves, deletions and sign-in changes will show here."}</EmptyState>
      ) : (
        <>
          <Table caption="Admin activity, newest first">
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>Who</th>
                <th className={th}>What</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const changes = entry.changes && typeof entry.changes === "object" && !Array.isArray(entry.changes) ? Object.entries(entry.changes as Record<string, [unknown, unknown]>) : [];
                const link = entry.entityId && !entry.action.endsWith(".delete") ? AREAS[entry.entityType]?.href?.(entry.entityId) : undefined;
                return (
                  <tr key={entry.id}>
                    <td className={`${td} align-top whitespace-nowrap tabular-nums text-muted`}>{formatDateTime(entry.createdAt)}</td>
                    <td className={`${td} align-top whitespace-nowrap`}>{entry.staff?.name ?? "Removed account"}</td>
                    <td className={`${td} align-top`}>
                      {link ? (
                        <Link href={link} className="hover:text-accent hover:underline">
                          {entry.summary ?? entry.action}
                        </Link>
                      ) : (
                        (entry.summary ?? entry.action)
                      )}
                      {changes.length > 0 && (
                        <details className="mt-1 text-xs text-muted">
                          <summary className="cursor-pointer select-none">
                            {changes.length} {changes.length === 1 ? "field" : "fields"} changed
                          </summary>
                          <ul className="mt-1 space-y-0.5">
                            {changes.map(([field, pair]) => (
                              <li key={field}>
                                <span className="font-medium text-ink">{fieldName(field)}</span>: {show(pair?.[0], field)} → {show(pair?.[1], field)}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          <Pager page={page} pageCount={pageCount} href={href} />
        </>
      )}
    </AdminPage>
  );
}
