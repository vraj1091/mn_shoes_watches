import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { formatDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { formatIndianMobile } from "@/lib/format/phone";
import { AdminPage } from "@/components/admin/admin-frame";
import { EmptyState, Pager, Table, TextInput, td, th } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Customers" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
const PAGE_SIZE = 30;

export default async function CustomersPage({ searchParams }: Props) {
  await requireStaff("customers.view");
  const params = await searchParams;
  const q = one(params.q).trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const digits = q.replace(/\D/g, "");
  const where: Prisma.CustomerWhereInput = {
    storeId: DEFAULT_STORE_ID,
    anonymizedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q.toLowerCase() } },
            ...(digits.length >= 5 ? [{ phone: { contains: digits.slice(-10) } }, { phoneNumber: { contains: digits.slice(-10) } }] : []),
          ],
        }
      : {}),
  };
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: [{ lastOrderAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, phone: true, phoneNumber: true, orderCount: true, totalSpent: true, lastOrderAt: true, hasAccount: true, isDemo: true },
    }),
    prisma.customer.count({ where }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminPage title="Customers" intro={`${total} ${total === 1 ? "customer" : "customers"}${q ? ` matching “${q}”` : ""}. Everyone who has ordered or made an account.`} wide>
      <form role="search" action="/admin/customers" className="mb-4 flex max-w-xl gap-2">
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <TextInput id="customer-search" name="q" type="search" defaultValue={q} placeholder="Name, email or phone" />
        <button type="submit" className={buttonClasses("secondary", "md")}>
          Search
        </button>
      </form>
      {customers.length === 0 ? (
        <EmptyState>{q ? "No customers match that search." : "No customers yet."}</EmptyState>
      ) : (
        <Table caption="Customers">
          <thead>
            <tr>
              <th className={th}>Customer</th>
              <th className={th}>Phone</th>
              <th className={`${th} text-right`}>Orders</th>
              <th className={`${th} text-right`}>Spent</th>
              <th className={th}>Last order</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => {
              const phone = customer.phoneNumber ?? customer.phone;
              return (
                <tr key={customer.id} className="hover:bg-surface">
                  <td className={td}>
                    <Link href={`/admin/customers/${customer.id}`} className="font-medium hover:text-link">
                      {customer.name}
                    </Link>
                    <span className="block text-xs break-all text-muted">
                      {customer.email}
                      {customer.hasAccount && " · has an account"}
                      {customer.isDemo && " · demo"}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{phone ? formatIndianMobile(phone) : "—"}</td>
                  <td className={`${td} text-right tabular-nums`}>{customer.orderCount}</td>
                  <td className={`${td} price text-right`}>{formatPrice(customer.totalSpent)}</td>
                  <td className={`${td} text-muted`}>{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pager page={page} pageCount={pageCount} href={(next) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), ...(next > 1 ? { page: String(next) } : {}) })}`} />
    </AdminPage>
  );
}
