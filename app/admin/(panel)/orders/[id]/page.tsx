import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db/client";
import { getAdminOrder } from "@/lib/admin/orders";
import { NEXT_STATUSES, PAYMENT_LABELS, STATUS_LABELS, STATUS_TONES, type OrderStatusName } from "@/lib/admin/order-status";
import { addOrderNote, changeOrderStatus, createInvoice } from "@/lib/actions/admin/orders";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatIndianMobile } from "@/lib/format/phone";
import { formatPrice } from "@/lib/format/money";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { Card, Field, StatusBadge, TextArea } from "@/components/admin/ui";
import { ArrowLeftIcon, PrinterIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, select: { number: true } });
  return { title: order ? `Order ${order.number}` : "Order" };
}

const row = "flex justify-between gap-4 py-1";

export default async function AdminOrderPage({ params }: Props) {
  const { user } = await requireStaff("orders.view");
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const status = order.status as OrderStatusName;
  const manage = can(user.role, "orders.manage");
  const next = NEXT_STATUSES[status];
  const shipping = order.addresses.find((address) => address.type === "SHIPPING");
  const shipment = order.shipments.find((entry) => entry.direction === "FORWARD");
  const invoice = await prisma.invoice.findFirst({ where: { orderId: order.id, type: "TAX_INVOICE" }, select: { number: true } });
  const invoiceable = status !== "PENDING_PAYMENT" && status !== "CANCELLED";

  return (
    <AdminPage
      title={`Order ${order.number}`}
      intro={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={STATUS_TONES[status]}>{STATUS_LABELS[status]}</StatusBadge>
          <span>Placed {formatDateTime(order.createdAt)}</span>
          {order.isDemo && <StatusBadge tone="warning">Demo order</StatusBadge>}
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/orders" variant="ghost" size="sm">
            <ArrowLeftIcon size={16} />
            All orders
          </ButtonLink>
          {invoice ? (
            <ButtonLink href={`/admin/orders/${order.id}/invoice`} variant="secondary" size="sm">
              <PrinterIcon size={16} />
              Invoice {invoice.number}
            </ButtonLink>
          ) : (
            manage &&
            invoiceable && (
              <ConfirmButton
                action={createInvoice.bind(null, order.id)}
                label="Create tax invoice"
                confirmLabel="Create invoice"
                question="This takes the next invoice number for the financial year. Invoice numbers cannot be reused."
                variant="secondary"
              />
            )
          )}
        </div>
      }
      wide
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card title={`${order.items.length} ${order.items.length === 1 ? "item" : "items"}`}>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    {item.brandName && <p className="text-xs tracking-wide text-muted uppercase">{item.brandName}</p>}
                    {item.productId ? (
                      <Link href={`/admin/products/${item.productId}`} className="font-medium hover:text-accent">
                        {item.productTitle}
                      </Link>
                    ) : (
                      <p className="font-medium">{item.productTitle}</p>
                    )}
                    <p className="text-sm text-muted">
                      {item.variantTitle && item.variantTitle !== "Default" ? `${item.variantTitle} · ` : ""}SKU {item.sku} · HSN {item.hsnCode} · GST{" "}
                      {item.gstRateBp / 100}%
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="price">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                    {item.discountAmount > 0 && <p className="price text-muted">−{formatPrice(item.discountAmount)} discount</p>}
                    <p className="price font-semibold">{formatPrice(item.lineTotal)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="mt-4 border-t border-line pt-4 text-sm">
              <div className={row}>
                <dt className="text-muted">Subtotal</dt>
                <dd className="price">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discountTotal > 0 && (
                <div className={row}>
                  <dt className="text-muted">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd className="price">−{formatPrice(order.discountTotal)}</dd>
                </div>
              )}
              <div className={row}>
                <dt className="text-muted">Delivery</dt>
                <dd className="price">{order.shippingTotal === 0 ? "Free" : formatPrice(order.shippingTotal)}</dd>
              </div>
              {order.codFee > 0 && (
                <div className={row}>
                  <dt className="text-muted">Cash on delivery fee</dt>
                  <dd className="price">{formatPrice(order.codFee)}</dd>
                </div>
              )}
              <div className={`${row} border-t border-line pt-2 text-base font-semibold`}>
                <dt>Total</dt>
                <dd className="price">{formatPrice(order.grandTotal)}</dd>
              </div>
              <div className={`${row} text-muted`}>
                <dt>GST included</dt>
                <dd className="price">{formatPrice(order.taxTotal)}</dd>
              </div>
              {order.amountRefunded > 0 && (
                <div className={`${row} text-accent`}>
                  <dt>Refunded</dt>
                  <dd className="price">−{formatPrice(order.amountRefunded)}</dd>
                </div>
              )}
            </dl>
          </Card>

          {manage && next.length > 0 && (
            <Card title="Update status">
              <OrderStatusForm
                action={changeOrderStatus.bind(null, order.id)}
                options={next.map((value) => ({ value, label: STATUS_LABELS[value] }))}
                hasShipment={Boolean(shipment)}
              />
            </Card>
          )}

          <Card title="Timeline">
            {manage && (
              <AdminForm action={addOrderNote.bind(null, order.id)} submitLabel="Add note" className="mb-6">
                <Field label="Internal note" hint="Only staff see notes.">
                  <TextArea name="note" rows={2} maxLength={1000} />
                </Field>
              </AdminForm>
            )}
            <ol className="grid gap-4">
              {order.events.map((event) => (
                <li key={event.id} className="border-l-2 border-line pl-4">
                  <p className="text-sm">
                    {event.isInternal && <StatusBadge>Note</StatusBadge>} {event.message}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDateTime(event.createdAt)}
                    {event.staff ? ` · ${event.staff.name}` : event.actor === "CUSTOMER" ? " · Customer" : event.actor === "SYSTEM" ? " · Automatic" : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card title="Customer">
            <p className="font-medium">
              {order.customer ? (
                <Link href={`/admin/customers/${order.customer.id}`} className="hover:text-accent">
                  {order.customer.name}
                </Link>
              ) : (
                (shipping?.name ?? "Guest")
              )}
            </p>
            {order.customer && order.customer.orderCount > 1 && <p className="text-sm text-muted">{order.customer.orderCount} orders in total</p>}
            <p className="mt-2 text-sm break-all">{order.email}</p>
            <p className="text-sm">{formatIndianMobile(order.phone)}</p>
            {order.customerNote && (
              <p className="mt-3 rounded-sm bg-surface p-3 text-sm">
                <span className="font-medium">Note from customer:</span> {order.customerNote}
              </p>
            )}
          </Card>

          {shipping && (
            <Card title="Delivery address">
              <address className="text-sm leading-relaxed not-italic">
                {shipping.name}
                <br />
                {shipping.line1}
                {shipping.line2 && (
                  <>
                    <br />
                    {shipping.line2}
                  </>
                )}
                {shipping.landmark && (
                  <>
                    <br />
                    Near {shipping.landmark}
                  </>
                )}
                <br />
                {shipping.city} {shipping.pinCode}
                <br />
                {shipping.state}
                <br />
                {formatIndianMobile(shipping.phone)}
              </address>
              {order.deliveryMinDate && order.deliveryMaxDate && (
                <p className="mt-3 text-sm text-muted">
                  Promised {formatDate(order.deliveryMinDate)} – {formatDate(order.deliveryMaxDate)}
                </p>
              )}
            </Card>
          )}

          <Card title="Payment">
            <dl className="text-sm">
              <div className={row}>
                <dt className="text-muted">Method</dt>
                <dd>{order.paymentMethod === "COD" ? "Cash on delivery" : "Online"}</dd>
              </div>
              <div className={row}>
                <dt className="text-muted">Status</dt>
                <dd>{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</dd>
              </div>
              {order.payments
                .filter((payment) => payment.providerPaymentId)
                .map((payment) => (
                  <div key={payment.id} className={row}>
                    <dt className="text-muted">{payment.provider === "RAZORPAY" ? "Razorpay" : "Payment"}</dt>
                    <dd className="font-mono text-xs break-all">{payment.providerPaymentId}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {shipment && (
            <Card title="Shipment">
              <dl className="text-sm">
                <div className={row}>
                  <dt className="text-muted">Courier</dt>
                  <dd>{shipment.courierName ?? "—"}</dd>
                </div>
                <div className={row}>
                  <dt className="text-muted">AWB</dt>
                  <dd className="font-mono text-xs">{shipment.awb ?? "—"}</dd>
                </div>
              </dl>
              {shipment.trackingUrl && (
                <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-link hover:text-accent underline underline-offset-4">
                  Courier tracking page
                </a>
              )}
            </Card>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
