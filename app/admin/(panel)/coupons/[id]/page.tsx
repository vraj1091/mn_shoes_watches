import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { deleteCoupon, saveCoupon } from "@/lib/actions/admin/coupons";
import { couponDefaults, couponState } from "@/lib/admin/coupons";
import { formatPrice } from "@/lib/format/money";
import { AdminPage } from "@/components/admin/admin-frame";
import { CouponFields } from "@/components/admin/coupon-fields";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { Card, StatusBadge } from "@/components/admin/ui";
import { ArrowLeftIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const coupon = await prisma.discount.findUnique({ where: { id }, select: { code: true } });
  return { title: coupon?.code ? `Coupon ${coupon.code}` : "Coupon" };
}

export default async function CouponPage({ params, searchParams }: Props) {
  await requireStaff("discounts.manage");
  const { id } = await params;
  const { created } = await searchParams;
  const coupon = await prisma.discount.findFirst({ where: { id, storeId: DEFAULT_STORE_ID } });
  if (!coupon) notFound();
  const state = couponState(coupon);
  const orders = await prisma.order.aggregate({ where: { storeId: DEFAULT_STORE_ID, couponCode: coupon.code }, _count: true, _sum: { discountTotal: true, grandTotal: true } });

  return (
    <AdminPage
      title={coupon.code ?? coupon.title}
      intro={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
          {coupon.isDemo && <StatusBadge tone="warning">Demo coupon</StatusBadge>}
          <span>
            Used on {orders._count} {orders._count === 1 ? "order" : "orders"}
            {orders._count > 0 && `, ${formatPrice(orders._sum.discountTotal ?? 0)} off ${formatPrice(orders._sum.grandTotal ?? 0)} in sales`}
          </span>
        </span>
      }
      actions={
        <ButtonLink href="/admin/coupons" variant="ghost" size="sm">
          <ArrowLeftIcon size={16} />
          All coupons
        </ButtonLink>
      }
    >
      {created && (
        <div className="mb-6">
          <FormAlert tone="success">Coupon added. Shoppers can use it from the start date.</FormAlert>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Card>
          <AdminForm action={saveCoupon.bind(null, coupon.id)} primary>
            <CouponFields coupon={couponDefaults(coupon)} />
          </AdminForm>
        </Card>
        <Card title="Delete">
          <p className="mb-3 text-sm text-muted">
            {coupon.usageCount > 0 ? "This code has been used, so deleting switches it off instead." : "Nobody has used this code yet."}
          </p>
          <ConfirmButton
            action={deleteCoupon.bind(null, coupon.id)}
            label={coupon.usageCount > 0 ? "Switch off" : "Delete coupon"}
            confirmLabel={coupon.usageCount > 0 ? "Switch off" : "Delete for good"}
            question={`${coupon.usageCount > 0 ? "Switch off" : "Delete"} ${coupon.code}?`}
          />
        </Card>
      </div>
    </AdminPage>
  );
}
