import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDashboard } from "@/lib/admin/dashboard";
import { STATUS_LABELS, STATUS_TONES, type OrderStatusName } from "@/lib/admin/order-status";
import { getSetupChecklist } from "@/lib/setup-checklist";
import { formatDateTime } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { AdminPage } from "@/components/admin/admin-frame";
import { SalesChart } from "@/components/admin/sales-chart";
import { Card, EmptyState, StatTile, StatusBadge, Table, td, th } from "@/components/admin/ui";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Dashboard" };

/** Headline numbers read better without paise. */
const wholeRupees = (paise: number) => Math.round(paise / 100) * 100;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminDashboard({ searchParams }: Props) {
  const { user } = await requireStaff("dashboard.view");
  const { denied } = await searchParams;
  const [dashboard, checklist] = await Promise.all([getDashboard(30), getSetupChecklist(user)]);
  const remaining = checklist.filter((item) => !item.done).length;
  const deniedPermission = typeof denied === "string" && (PERMISSIONS as readonly string[]).includes(denied);

  return (
    <AdminPage title={`Hello, ${user.name.split(" ")[0]}`} intro="The last 30 days at a glance." wide>
      {deniedPermission && (
        <div className="mb-8">
          <FormAlert tone="info">Your role does not include that page. Ask the shop owner if you need it.</FormAlert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Sales, last 30 days" value={formatPrice(wholeRupees(dashboard.sales))} note="Incl. GST, placed orders only" />
        <StatTile label="Orders" value={String(dashboard.orders)} note={`${dashboard.toShip} to pack or ship`} />
        <StatTile label="Average order value" value={formatPrice(wholeRupees(dashboard.averageOrder))} />
        <StatTile label="Low stock" value={String(dashboard.lowStock.length)} note={`At or below ${dashboard.lowStockThreshold} units`} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <SalesChart days={dashboard.series} title="Sales per day, last 30 days" />
        </Card>
        <Card title="Low stock" actions={<Link href="/admin/products?stock=low" className="text-sm text-link underline underline-offset-4">All low stock</Link>}>
          {dashboard.lowStock.length === 0 ? (
            <p className="text-sm text-muted">Nothing is running low.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {dashboard.lowStock.map((variant) => (
                <li key={variant.id} className="flex items-center justify-between gap-3 py-2">
                  <Link href={`/admin/products/${variant.product.id}`} className="min-w-0 hover:text-link">
                    <span className="block truncate font-medium">{variant.product.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {variant.title === "Default" ? variant.sku : `${variant.title} · ${variant.sku}`}
                    </span>
                  </Link>
                  <StatusBadge tone={variant.stockOnHand === 0 ? "bad" : "neutral"}>{variant.stockOnHand === 0 ? "Sold out" : `${variant.stockOnHand} left`}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="recent-orders" className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-orders" className="text-lg font-semibold">
            Recent orders
          </h2>
          <Link href="/admin/orders" className="text-sm text-link underline underline-offset-4">
            All orders
          </Link>
        </div>
        {dashboard.recent.length === 0 ? (
          <EmptyState>No orders yet.</EmptyState>
        ) : (
          <Table caption="Recent orders">
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Placed</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recent.map((order) => (
                <tr key={order.id}>
                  <td className={td}>
                    <Link href={`/admin/orders/${order.id}`} className="font-semibold text-link underline-offset-4 hover:underline">
                      {order.number}
                    </Link>
                  </td>
                  <td className={td}>{order.addresses[0] ? `${order.addresses[0].name}, ${order.addresses[0].city}` : "—"}</td>
                  <td className={`${td} text-muted`}>{formatDateTime(order.createdAt)}</td>
                  <td className={td}>
                    <StatusBadge tone={STATUS_TONES[order.status as OrderStatusName]}>{STATUS_LABELS[order.status as OrderStatusName]}</StatusBadge>
                  </td>
                  <td className={`${td} price text-right font-medium`}>{formatPrice(order.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section aria-labelledby="setup-heading" className="mt-8 rounded-md border border-line bg-raised">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <h2 id="setup-heading" className="text-lg font-semibold">
            Before you take real orders
          </h2>
          <p className="text-sm text-muted tabular-nums">{remaining === 0 ? "All done" : `${checklist.length - remaining} of ${checklist.length} done`}</p>
        </div>
        <ul>
          {checklist.map((item) => (
            <li key={item.id} className="flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
              {item.done ? <CheckIcon size={22} className="mt-0.5 shrink-0 text-stock" label="Done" /> : <InfoIcon size={22} className="mt-0.5 shrink-0 text-link" label="To do" />}
              <div>
                <p className={`text-base font-medium ${item.done ? "text-muted line-through decoration-1" : ""}`}>{item.label}</p>
                {!item.done && <p className="mt-0.5 text-sm text-muted">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminPage>
  );
}
