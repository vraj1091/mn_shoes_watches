import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { listOrders, ORDER_TABS } from "@/lib/admin/orders";
import { PAYMENT_LABELS, STATUS_LABELS, STATUS_TONES, type OrderStatusName } from "@/lib/admin/order-status";
import { formatDateTime } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { AdminPage } from "@/components/admin/admin-frame";
import { EmptyState, Pager, StatusBadge, Table, TextInput, td, th } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Orders" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireStaff("orders.view");
  const params = await searchParams;
  const tab = ORDER_TABS.some((entry) => entry.key === one(params.tab)) ? one(params.tab) : "all";
  const q = one(params.q).slice(0, 80);
  const page = Math.max(1, Number.parseInt(one(params.page), 10) || 1);
  const { orders, total, pageCount } = await listOrders({ tab, q, page });
  const href = (next: { tab?: string; page?: number }) => {
    const query = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    if (nextTab !== "all") query.set("tab", nextTab);
    if (q) query.set("q", q);
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const text = query.toString();
    return `/admin/orders${text ? `?${text}` : ""}`;
  };

  return (
    <AdminPage title="Orders" intro={`${total} ${total === 1 ? "order" : "orders"}${q ? ` matching “${q}”` : ""}.`} wide>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Order status" className="-mx-1 overflow-x-auto">
          <ul className="flex gap-1 px-1">
            {ORDER_TABS.map((entry) => (
              <li key={entry.key}>
                <Link
                  href={href({ tab: entry.key })}
                  aria-current={entry.key === tab ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm whitespace-nowrap text-muted hover:bg-raised hover:text-ink aria-[current=page]:bg-raised aria-[current=page]:font-semibold aria-[current=page]:text-ink aria-[current=page]:shadow-[inset_0_-2px_0_var(--ink)]"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form role="search" action="/admin/orders" className="flex w-full gap-2 sm:w-auto">
          {tab !== "all" && <input type="hidden" name="tab" value={tab} />}
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <TextInput id="order-search" name="q" type="search" defaultValue={q} placeholder="Order number, name, phone or email" className="sm:w-72" />
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Search
          </button>
        </form>
      </div>

      {orders.length === 0 ? (
        <EmptyState>{q ? "No orders match that search." : "No orders here yet."}</EmptyState>
      ) : (
        <Table caption="Orders">
          <thead>
            <tr>
              <th className={th}>Order</th>
              <th className={th}>Customer</th>
              <th className={th}>Placed</th>
              <th className={th}>Payment</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const address = order.addresses[0];
              return (
                <tr key={order.id} className="hover:bg-surface">
                  <td className={td}>
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-link hover:text-accent underline-offset-4 hover:underline">
                      {order.number}
                    </Link>
                    <span className="block text-xs text-muted">
                      {order._count.items} {order._count.items === 1 ? "item" : "items"}
                      {order.isDemo && " · demo"}
                    </span>
                  </td>
                  <td className={td}>
                    {address ? (
                      <>
                        <span className="block font-medium">{address.name}</span>
                        <span className="block text-xs text-muted">
                          {address.city} {address.pinCode}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(order.createdAt)}</td>
                  <td className={td}>
                    <span className="block">{order.paymentMethod === "COD" ? "Cash on delivery" : "Online"}</span>
                    <span className="block text-xs text-muted">{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</span>
                  </td>
                  <td className={td}>
                    <StatusBadge tone={STATUS_TONES[order.status as OrderStatusName]}>{STATUS_LABELS[order.status as OrderStatusName]}</StatusBadge>
                  </td>
                  <td className={`${td} price text-right font-medium`}>{formatPrice(order.grandTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
      <Pager page={page} pageCount={pageCount} href={(next) => href({ page: next })} />
    </AdminPage>
  );
}
