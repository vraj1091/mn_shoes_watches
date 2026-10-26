import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { addCustomerNote } from "@/lib/actions/admin/customers";
import { STATUS_LABELS, STATUS_TONES, type OrderStatusName } from "@/lib/admin/order-status";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { formatIndianMobile } from "@/lib/format/phone";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm } from "@/components/admin/forms";
import { Card, EmptyState, Field, StatTile, StatusBadge, Table, TextArea, td, th } from "@/components/admin/ui";
import { ArrowLeftIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id }, select: { name: true } });
  return { title: customer?.name ?? "Customer" };
}

export default async function CustomerPage({ params }: Props) {
  const { user } = await requireStaff("customers.view");
  const { id } = await params;
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, number: true, status: true, grandTotal: true, createdAt: true, _count: { select: { items: true } } } },
      addresses: { orderBy: { isDefault: "desc" } },
      notes: { orderBy: { createdAt: "desc" }, include: { staff: { select: { name: true } } } },
      _count: { select: { wishlistItems: true, reviews: true } },
    },
  });
  if (!customer) notFound();
  const phone = customer.phoneNumber ?? customer.phone;
  const average = customer.orderCount > 0 ? Math.round(customer.totalSpent / customer.orderCount) : 0;

  return (
    <AdminPage
      title={customer.name}
      intro={
        <span className="flex flex-wrap items-center gap-2">
          <span className="break-all">{customer.email}</span>
          {phone && <span>· {formatIndianMobile(phone)}</span>}
          {customer.isDemo && <StatusBadge tone="badge">Demo customer</StatusBadge>}
        </span>
      }
      actions={
        <ButtonLink href="/admin/customers" variant="ghost" size="sm">
          <ArrowLeftIcon size={16} />
          All customers
        </ButtonLink>
      }
      wide
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Orders" value={String(customer.orderCount)} />
        <StatTile label="Spent" value={formatPrice(customer.totalSpent)} note="Net of refunds" />
        <StatTile label="Average order" value={formatPrice(average)} />
        <StatTile label="Customer since" value={formatDate(customer.firstOrderAt ?? customer.createdAt)} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="orders-heading" className="min-w-0">
          <h2 id="orders-heading" className="mb-3 text-lg font-semibold">
            Orders
          </h2>
          {customer.orders.length === 0 ? (
            <EmptyState>No orders yet.</EmptyState>
          ) : (
            <Table caption="Orders">
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Placed</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td className={td}>
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-link underline-offset-4 hover:underline">
                        {order.number}
                      </Link>
                      <span className="block text-xs text-muted">
                        {order._count.items} {order._count.items === 1 ? "item" : "items"}
                      </span>
                    </td>
                    <td className={`${td} text-muted`}>{formatDateTime(order.createdAt)}</td>
                    <td className={td}>
                      <StatusBadge tone={STATUS_TONES[order.status as OrderStatusName]}>{STATUS_LABELS[order.status as OrderStatusName]}</StatusBadge>
                    </td>
                    <td className={`${td} price text-right`}>{formatPrice(order.grandTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card title="Details">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Account</dt>
                <dd>{customer.hasAccount ? "Yes" : "Guest checkout"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Email offers</dt>
                <dd>{customer.acceptsEmail ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">WhatsApp updates</dt>
                <dd>{customer.acceptsWhatsapp ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Wishlist</dt>
                <dd>{customer._count.wishlistItems} items</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Reviews written</dt>
                <dd>{customer._count.reviews}</dd>
              </div>
            </dl>
          </Card>

          {customer.addresses.length > 0 && (
            <Card title="Saved addresses">
              <ul className="grid gap-4 text-sm">
                {customer.addresses.map((address) => (
                  <li key={address.id}>
                    <address className="leading-relaxed not-italic">
                      {address.name}
                      <br />
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                      <br />
                      {address.city} {address.pinCode}, {address.state}
                    </address>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Notes">
            {can(user.role, "customers.manage") && (
              <AdminForm action={addCustomerNote.bind(null, customer.id)} submitLabel="Add note" className="mb-5">
                <Field label="Note" hint="Only staff see notes.">
                  <TextArea name="note" rows={2} maxLength={1000} />
                </Field>
              </AdminForm>
            )}
            {customer.notes.length === 0 ? (
              <p className="text-sm text-muted">No notes yet.</p>
            ) : (
              <ol className="grid gap-4">
                {customer.notes.map((note) => (
                  <li key={note.id} className="border-l-2 border-line pl-4 text-sm">
                    <p>{note.body}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDateTime(note.createdAt)}
                      {note.staff ? ` · ${note.staff.name}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </AdminPage>
  );
}
