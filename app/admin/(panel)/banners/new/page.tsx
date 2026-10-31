import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { saveBanner } from "@/lib/actions/admin/banners";
import { productPhotoLibrary } from "@/lib/admin/banners";
import { AdminPage } from "@/components/admin/admin-frame";
import { BannerFields } from "@/components/admin/banner-fields";
import { AdminForm } from "@/components/admin/forms";
import { Card } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Add banner" };

export default async function NewBannerPage() {
  await requireStaff("content.manage");
  const library = await productPhotoLibrary();
  return (
    <AdminPage title="Add banner" intro="New banners go last; reorder them on the banners page.">
      <Card>
        <AdminForm action={saveBanner.bind(null, null)} submitLabel="Add banner" primary>
          <BannerFields banner={{ title: "", subtitle: "", ctaLabel: "", ctaHref: "", image: null, startsAt: "", endsAt: "", isActive: true }} library={library} />
        </AdminForm>
      </Card>
    </AdminPage>
  );
}
