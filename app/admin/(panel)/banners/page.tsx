import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { moveBanner } from "@/lib/actions/admin/banners";
import { bannerState } from "@/lib/admin/banners";
import { formatDate } from "@/lib/format/date";
import { mediaUrl } from "@/lib/media/url";
import { AdminPage } from "@/components/admin/admin-frame";
import { MoveButtons } from "@/components/admin/move-buttons";
import { EmptyState, StatusBadge } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Home banners" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BannersPage({ searchParams }: Props) {
  await requireStaff("content.manage");
  const { created, deleted } = await searchParams;
  const banners = await prisma.banner.findMany({
    where: { storeId: DEFAULT_STORE_ID, placement: "HOME_HERO" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { desktopImage: { select: { key: true, alt: true, mimeType: true } } },
  });
  const live = banners.filter((banner) => bannerState(banner).label === "Live").length;

  return (
    <AdminPage
      title="Home banners"
      intro={`The large slides at the top of the home page, in this order. ${live} of ${banners.length} showing now.`}
      actions={
        <ButtonLink href="/admin/banners/new">
          <PlusIcon size={18} />
          Add banner
        </ButtonLink>
      }
    >
      {created && (
        <div className="mb-6">
          <FormAlert tone="success">Banner added.</FormAlert>
        </div>
      )}
      {deleted && (
        <div className="mb-6">
          <FormAlert tone="success">Banner deleted.</FormAlert>
        </div>
      )}
      {banners.length === 0 ? (
        <EmptyState>No banners. The home page starts with the categories until you add one.</EmptyState>
      ) : (
        <ol className="grid gap-3">
          {banners.map((banner, index) => {
            const state = bannerState(banner);
            const image = banner.desktopImage;
            return (
              <li key={banner.id} className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-raised p-3 sm:flex-nowrap">
                <div className="photo-tile relative aspect-[16/11] w-32 shrink-0 overflow-hidden rounded-sm">
                  {image?.key && (
                    <Image
                      src={mediaUrl(image.key)}
                      alt=""
                      fill
                      sizes="128px"
                      className={image.mimeType === "image/svg+xml" ? "object-cover mix-blend-normal" : "object-contain p-2"}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/banners/${banner.id}`} className="font-medium hover:text-link">
                    {banner.title}
                  </Link>
                  {banner.subtitle && <p className="truncate text-sm text-muted">{banner.subtitle}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                    {(banner.startsAt || banner.endsAt) && (
                      <span>
                        {banner.startsAt ? formatDate(banner.startsAt) : "Now"} – {banner.endsAt ? formatDate(banner.endsAt) : "no end"}
                      </span>
                    )}
                    {banner.ctaHref && <span>Button → {banner.ctaHref}</span>}
                    {banner.isDemo && <span>demo</span>}
                  </p>
                </div>
                <MoveButtons move={moveBanner.bind(null, banner.id)} label={banner.title} first={index === 0} last={index === banners.length - 1} />
              </li>
            );
          })}
        </ol>
      )}
    </AdminPage>
  );
}
