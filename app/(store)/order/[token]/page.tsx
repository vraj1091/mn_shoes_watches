import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderByToken } from "@/lib/data/orders";
import { formatDeliveryDay, formatDateTime } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { formatIndianMobile } from "@/lib/format/phone";
import { t } from "@/lib/i18n";
import { CheckIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";

type Props = { params: Promise<{ token: string }> };

/** "Tue, 27 Oct", or "Tue, 27 Oct – Thu, 29 Oct" when the earliest and latest days differ. */
function dayRange(from: Date, to: Date) {
  const a = formatDeliveryDay(from);
  const b = formatDeliveryDay(to);
  return a === b ? a : `${a} – ${b}`;
}

export const metadata: Metadata = { title: t("order.title"), robots: { index: false, follow: false } };

/** Order confirmation, reached from checkout and from the link in the confirmation email. */
export default async function OrderPage({ params }: Props) {
  const order = await getOrderByToken((await params).token);
  if (!order) notFound();

  const pending = order.status === "PENDING_PAYMENT";
  const address = order.shippingAddress;
  const payment = order.payments[0];
  const method =
    order.paymentMethod === "COD" ? t("order.methodCod") : payment?.provider === "MANUAL" ? t("order.methodDemo") : t("order.methodOnline");
  const row = "flex justify-between gap-4 py-1.5";

  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-4 sm:px-6">
      {!pending && (
        <p className="flex size-12 items-center justify-center rounded-full bg-surface text-success">
          <CheckIcon size={28} />
        </p>
      )}
      <h1 className="mt-4 font-display text-4xl">{pending ? t("order.titlePending") : t("order.title")}</h1>
      <p className="mt-2 text-lg font-semibold">{t("order.number", { number: order.number })}</p>
      <div className="mt-4 space-y-1 text-base">
        {!pending && <p>{t("order.confirmationSent", { email: order.email })}</p>}
        {order.paymentMethod === "COD" ? (
          <p>{t("order.codPay", { amount: formatPrice(order.grandTotal) })}</p>
        ) : order.paymentStatus === "PAID" ? (
          <p className="text-success">{t("order.paid")}</p>
        ) : null}
        {order.deliveryMinDate && order.deliveryMaxDate && (
          <p>{t("order.delivery", { range: dayRange(order.deliveryMinDate, order.deliveryMaxDate) })}</p>
        )}
        {order.placedAt && <p className="text-sm text-muted">{formatDateTime(order.placedAt)}</p>}
      </div>

      <section aria-labelledby="order-items" className="mt-10 rounded-md border border-line p-5 sm:p-6">
        <h2 id="order-items" className="text-lg font-semibold">
          {t("order.items")}
        </h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-3">
              <span className="photo-tile relative size-16 shrink-0 overflow-hidden rounded-sm">
                {item.imageUrl && <Image src={item.imageUrl} alt={item.imageAlt} fill sizes="64px" className={item.imageUrl.endsWith(".svg") ? "object-cover mix-blend-normal" : "object-contain p-1"} />}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                {item.brandName && <span className="block text-xs font-semibold tracking-wide text-muted uppercase">{item.brandName}</span>}
                {item.slug ? (
                  <Link href={`/product/${item.slug}`} className="font-medium hover:text-accent">
                    {item.productTitle}
                  </Link>
                ) : (
                  <span className="font-medium">{item.productTitle}</span>
                )}
                <span className="block text-muted">
                  {[item.variantTitle, `× ${item.quantity}`].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="price text-sm font-semibold">{formatPrice(item.unitPrice * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="price mt-3 border-t border-line pt-3 text-sm">
          <div className={row}>
            <dt>{t("bag.subtotal")}</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 && (
            <div className={`${row} text-success`}>
              <dt>
                {t("bag.discount")}
                {order.couponCode ? ` (${order.couponCode})` : ""}
              </dt>
              <dd>−{formatPrice(order.discountTotal)}</dd>
            </div>
          )}
          <div className={row}>
            <dt>{t("bag.delivery")}</dt>
            <dd>{order.shippingTotal === 0 ? t("bag.free") : formatPrice(order.shippingTotal)}</dd>
          </div>
          {order.codFee > 0 && (
            <div className={row}>
              <dt>{t("bag.codFee")}</dt>
              <dd>{formatPrice(order.codFee)}</dd>
            </div>
          )}
          <div className={`${row} mt-1 border-t border-line pt-3 text-base font-semibold`}>
            <dt>{t("bag.total")}</dt>
            <dd>{formatPrice(order.grandTotal)}</dd>
          </div>
          <p className="text-xs text-muted">{t("bag.inclGst", { amount: formatPrice(order.taxTotal) })}</p>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {address && (
          <section aria-labelledby="order-address" className="rounded-md border border-line p-5">
            <h2 id="order-address" className="text-sm font-semibold">
              {t("order.deliverTo")}
            </h2>
            <address className="mt-2 text-sm not-italic">
              {address.name}
              <br />
              {[address.line1, address.line2, address.landmark].filter(Boolean).join(", ")}
              <br />
              {address.city}, {address.state} {address.pinCode}
              <br />
              {formatIndianMobile(address.phone)}
            </address>
          </section>
        )}
        <section aria-labelledby="order-payment" className="rounded-md border border-line p-5">
          <h2 id="order-payment" className="text-sm font-semibold">
            {t("order.paymentMethod")}
          </h2>
          <p className="mt-2 text-sm">{method}</p>
          <p className="mt-1 text-sm text-muted">{t(`order.status.${order.status}`)}</p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/track?order=${encodeURIComponent(order.number)}`} className={buttonClasses("secondary", "md")}>
          {t("order.track")}
        </Link>
        <Link href="/" className={buttonClasses("primary", "md")}>
          {t("order.keepShopping")}
        </Link>
      </div>
    </div>
  );
}
