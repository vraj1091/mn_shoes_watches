import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { deleteBanner, saveBanner } from "@/lib/actions/admin/banners";
import { bannerState, productPhotoLibrary } from "@/lib/admin/banners";
import { istDateKey } from "@/lib/format/date";
import { mediaUrl } from "@/lib/media/url";
import { AdminPage } from "@/components/admin/admin-frame";
import { BannerFields } from "@/components/admin/banner-fields";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { Card, StatusBadge } from "@/components/admin/ui";
import { ArrowLeftIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Banner" };

type Props = { params: Promise<{ id: string }> };

export default async function BannerPage({ params }: Props) {
  await requireStaff("content.manage");
  const { id } = await params;
  const [banner, library] = await Promise.all([
    prisma.banner.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, include: { desktopImage: { select: { id: true, key: true, alt: true } } } }),
    productPhotoLibrary(),
  ]);
  if (!banner) notFound();
  const state = bannerState(banner);
  const image = banner.desktopImage?.key ? { id: banner.desktopImage.id, url: mediaUrl(banner.desktopImage.key), alt: banner.desktopImage.alt ?? "" } : null;

  return (
    <AdminPage
      title={banner.title}
      intro={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
          {banner.isDemo && <StatusBadge tone="warning">Demo banner</StatusBadge>}
        </span>
      }
      actions={
        <ButtonLink href="/admin/banners" variant="ghost" size="sm">
          <ArrowLeftIcon size={16} />
          All banners
        </ButtonLink>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Card>
          <AdminForm action={saveBanner.bind(null, banner.id)} primary>
            <BannerFields
              banner={{
                title: banner.title,
                subtitle: banner.subtitle ?? "",
                ctaLabel: banner.ctaLabel ?? "",
                ctaHref: banner.ctaHref ?? "",
                image,
                startsAt: banner.startsAt ? istDateKey(banner.startsAt) : "",
                endsAt: banner.endsAt ? istDateKey(banner.endsAt) : "",
                isActive: banner.isActive,
              }}
              library={library}
            />
          </AdminForm>
        </Card>
        <Card title="Delete">
          <p className="mb-3 text-sm text-muted">Removes the banner from the home page. Its photo stays in the library.</p>
          <ConfirmButton action={deleteBanner.bind(null, banner.id)} label="Delete banner" confirmLabel="Delete for good" question="Delete this banner?" />
        </Card>
      </div>
    </AdminPage>
  );
}
