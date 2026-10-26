import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { saveBrand } from "@/lib/actions/admin/catalog";
import { AdminPage } from "@/components/admin/admin-frame";
import { BrandFields } from "@/components/admin/brand-fields";
import { AdminForm } from "@/components/admin/forms";
import { Card, EmptyState, StatusBadge, Table, td, th } from "@/components/admin/ui";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Brands" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BrandsPage({ searchParams }: Props) {
  await requireStaff("catalogue.manage");
  const { deleted } = await searchParams;
  const brands = await prisma.brand.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, isActive: true, isFeatured: true, isDemo: true, countryOfOrigin: true, _count: { select: { products: true } } },
  });

  return (
    <AdminPage title="Brands" intro="Each brand with products on sale gets its own page at /brands/… and appears in the brand filter." wide>
      {deleted && (
        <div className="mb-6">
          <FormAlert tone="success">Brand deleted.</FormAlert>
        </div>
      )}
      {brands.length === 0 ? (
        <EmptyState>No brands yet.</EmptyState>
      ) : (
        <Table caption="Brands">
          <thead>
            <tr>
              <th className={th}>Brand</th>
              <th className={th}>Address</th>
              <th className={th}>Country</th>
              <th className={`${th} text-right`}>Products</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} className="hover:bg-surface">
                <td className={td}>
                  <Link href={`/admin/brands/${brand.id}`} className="font-medium hover:text-link">
                    {brand.name}
                  </Link>
                  {brand.isDemo && <span className="ml-2 text-xs text-muted">demo</span>}
                </td>
                <td className={`${td} text-muted`}>/brands/{brand.slug}</td>
                <td className={`${td} text-muted`}>{brand.countryOfOrigin ?? "—"}</td>
                <td className={`${td} text-right tabular-nums`}>
                  <Link href={`/admin/products?brand=${brand.id}`} className="hover:text-link">
                    {brand._count.products}
                  </Link>
                </td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1">
                    {brand.isActive ? <StatusBadge tone="good">Shown</StatusBadge> : <StatusBadge tone="bad">Hidden</StatusBadge>}
                    {brand.isFeatured && <StatusBadge tone="info">Featured</StatusBadge>}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Card title="Add a brand" className="mt-8 max-w-3xl">
        <AdminForm action={saveBrand.bind(null, null)} submitLabel="Add brand">
          <BrandFields />
        </AdminForm>
      </Card>
    </AdminPage>
  );
}
