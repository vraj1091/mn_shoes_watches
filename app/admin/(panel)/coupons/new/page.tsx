import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { saveCoupon } from "@/lib/actions/admin/coupons";
import { couponDefaults } from "@/lib/admin/coupons";
import { AdminPage } from "@/components/admin/admin-frame";
import { CouponFields } from "@/components/admin/coupon-fields";
import { AdminForm } from "@/components/admin/forms";
import { Card } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Add coupon" };

export default async function NewCouponPage() {
  await requireStaff("discounts.manage");
  return (
    <AdminPage title="Add coupon">
      <Card>
        <AdminForm action={saveCoupon.bind(null, null)} submitLabel="Add coupon" primary>
          <CouponFields coupon={couponDefaults()} />
        </AdminForm>
      </Card>
    </AdminPage>
  );
}
