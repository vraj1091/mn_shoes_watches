import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { couponState, describeCoupon } from "@/lib/admin/coupons";
import { formatDate } from "@/lib/format/date";
import { AdminPage } from "@/components/admin/admin-frame";
import { EmptyState, StatusBadge, Table, td, th } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Coupons" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CouponsPage({ searchParams }: Props) {
  await requireStaff("discounts.manage");
  const { deleted, disabled } = await searchParams;
  const coupons = await prisma.discount.findMany({ where: { storeId: DEFAULT_STORE_ID, code: { not: null } }, orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] });

  return (
    <AdminPage
      title="Coupons"
      intro="Codes shoppers enter in the bag or at checkout. One code per order."
      actions={
        <ButtonLink href="/admin/coupons/new">
          <PlusIcon size={18} />
          Add coupon
        </ButtonLink>
      }
      wide
    >
      {deleted && (
        <div className="mb-6">
          <FormAlert tone="success">Coupon deleted.</FormAlert>
        </div>
      )}
      {disabled && (
        <div className="mb-6">
          <FormAlert tone="info">That coupon has been used, so it was switched off instead of deleted. Past orders still show it.</FormAlert>
        </div>
      )}
      {coupons.length === 0 ? (
        <EmptyState>No coupons yet.</EmptyState>
      ) : (
        <Table caption="Coupons">
          <thead>
            <tr>
              <th className={th}>Code</th>
              <th className={th}>Discount</th>
              <th className={th}>Dates</th>
              <th className={`${th} text-right`}>Used</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => {
              const state = couponState(coupon);
              return (
                <tr key={coupon.id} className="hover:bg-surface">
                  <td className={td}>
                    <Link href={`/admin/coupons/${coupon.id}`} className="font-mono font-semibold hover:text-link">
                      {coupon.code}
                    </Link>
                    {coupon.title !== coupon.code && <span className="block text-xs text-muted">{coupon.title}</span>}
                  </td>
                  <td className={td}>{describeCoupon(coupon)}</td>
                  <td className={`${td} text-muted`}>
                    {formatDate(coupon.startsAt)} – {coupon.endsAt ? formatDate(coupon.endsAt) : "no end"}
                  </td>
                  <td className={`${td} text-right tabular-nums`}>
                    {coupon.usageCount}
                    {coupon.usageLimit !== null && <span className="text-muted"> / {coupon.usageLimit}</span>}
                  </td>
                  <td className={td}>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                    {coupon.isDemo && <span className="ml-2 text-xs text-muted">demo</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </AdminPage>
  );
}
