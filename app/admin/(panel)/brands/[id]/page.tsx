import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { deleteBrand, saveBrand } from "@/lib/actions/admin/catalog";
import { AdminPage } from "@/components/admin/admin-frame";
import { BrandFields } from "@/components/admin/brand-fields";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { Card, StatusBadge } from "@/components/admin/ui";
import { ArrowLeftIcon, StoreIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const brand = await prisma.brand.findUnique({ where: { id }, select: { name: true } });
  return { title: brand?.name ?? "Brand" };
}

export default async function BrandPage({ params, searchParams }: Props) {
  await requireStaff("catalogue.manage");
  const { id } = await params;
  const { created } = await searchParams;
  const brand = await prisma.brand.findFirst({ where: { id, storeId: DEFAULT_STORE_ID }, include: { _count: { select: { products: true } } } });
  if (!brand) notFound();
  const onSale = await prisma.product.count({ where: { brandId: brand.id, status: "ACTIVE" } });

  return (
    <AdminPage
      title={brand.name}
      intro={
        <span className="flex flex-wrap items-center gap-2">
          /brands/{brand.slug}
          {brand.isDemo && <StatusBadge tone="warning">Demo brand</StatusBadge>}
        </span>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/brands" variant="ghost" size="sm">
            <ArrowLeftIcon size={16} />
            All brands
          </ButtonLink>
          {brand.isActive && onSale > 0 && (
            <ButtonLink href={`/brands/${brand.slug}`} variant="secondary" size="sm" target="_blank">
              <StoreIcon size={16} />
              View in shop
            </ButtonLink>
          )}
          <ButtonLink href={`/admin/products?brand=${brand.id}`} variant="secondary" size="sm">
            {brand._count.products} products
          </ButtonLink>
        </div>
      }
    >
      {created && (
        <div className="mb-6">
          <FormAlert tone="success">Brand added. Its page appears once a product of this brand is on sale.</FormAlert>
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Card title="Brand">
          <AdminForm action={saveBrand.bind(null, brand.id)} primary>
            <BrandFields brand={brand} />
          </AdminForm>
        </Card>
        <Card title="Delete">
          <p className="mb-3 text-sm text-muted">
            {brand._count.products > 0 ? "A brand with products cannot be deleted. Give its products another brand first, or hide it." : "This brand has no products and can be deleted."}
          </p>
          {brand._count.products === 0 && <ConfirmButton action={deleteBrand.bind(null, brand.id)} label="Delete brand" confirmLabel="Delete for good" question={`Delete ${brand.name}?`} />}
        </Card>
      </div>
    </AdminPage>
  );
}
