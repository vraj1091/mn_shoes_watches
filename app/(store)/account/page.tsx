import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { formatDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/money";
import { formatIndianMobile } from "@/lib/format/phone";
import { t } from "@/lib/i18n";
import { SignOutIcon } from "@/components/icons";
import { SignOutButton } from "@/components/store/sign-out-button";

export const metadata: Metadata = { title: "Your account", robots: { index: false, follow: false } };

export default async function AccountPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account/sign-in?next=/account");
  const [customer, orders] = await Promise.all([
    prisma.customer.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, phone: true, phoneNumber: true } }),
    // Unpaid online orders are left out: they are not orders until the payment arrives.
    prisma.order.findMany({
      where: { storeId: DEFAULT_STORE_ID, customerId: session.user.id, status: { not: "PENDING_PAYMENT" } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, number: true, publicToken: true, status: true, grandTotal: true, createdAt: true, _count: { select: { items: true } } },
    }),
  ]);
  const email = customer?.email ?? session.user.email;
  const isPhoneOnly = email.endsWith("@phone.invalid");
  const phone = customer?.phoneNumber ?? customer?.phone;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
      <h1 className="font-display text-4xl lg:text-5xl">{customer?.name || t("account.overviewTitle")}</h1>
      {!isPhoneOnly && <p className="mt-3 text-base text-muted">{t("account.signedInAs", { email })}</p>}

      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <section aria-labelledby="orders-heading" className="lg:col-span-8">
          <h2 id="orders-heading" className="text-xl font-semibold">
            {t("account.ordersTitle")}
          </h2>
          {orders.length === 0 ? (
            <p className="measure mt-4 text-base text-muted">{t("account.noOrders")}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {orders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4">
                  <div>
                    <p className="font-semibold">{order.number}</p>
                    <p className="text-sm text-muted">
                      {t("account.orderPlaced", { date: formatDate(order.createdAt) })} ·{" "}
                      {order._count.items === 1 ? t("account.orderItem") : t("account.orderItems", { count: order._count.items })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span className="text-sm">{t(`order.status.${order.status}`)}</span>
                    <span className="price font-medium">{formatPrice(order.grandTotal)}</span>
                    <Link href={`/order/${order.publicToken}`} prefetch={false} className="text-sm text-link hover:text-accent underline underline-offset-4">
                      {t("account.viewOrder")}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="details-heading" className="lg:col-span-4">
          <h2 id="details-heading" className="text-xl font-semibold">
            {t("account.detailsTitle")}
          </h2>
          <dl className="mt-4 grid gap-3 text-base">
            <div>
              <dt className="text-sm text-muted">{t("account.detailsName")}</dt>
              <dd>{customer?.name || t("account.notGiven")}</dd>
            </div>
            {!isPhoneOnly && (
              <div>
                <dt className="text-sm text-muted">{t("account.detailsEmail")}</dt>
                <dd className="break-all">{email}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-muted">{t("account.detailsPhone")}</dt>
              <dd>{phone ? formatIndianMobile(phone) : t("account.notGiven")}</dd>
            </div>
          </dl>
          <div className="mt-8">
            <SignOutButton label={t("common.signOut")} icon={<SignOutIcon size={20} />} />
          </div>
        </section>
      </div>
    </div>
  );
}
