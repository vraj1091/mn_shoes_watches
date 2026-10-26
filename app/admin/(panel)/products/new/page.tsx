import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { brandOptions, categoryOptions } from "@/lib/admin/products";
import { AdminPage } from "@/components/admin/admin-frame";
import { NewProductForm } from "@/components/admin/new-product-form";
import { Card } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  await requireStaff("catalogue.manage");
  const [categories, brands, sizeAttribute] = await Promise.all([
    categoryOptions(),
    brandOptions(),
    prisma.attribute.findFirst({ where: { storeId: DEFAULT_STORE_ID, code: "size_uk" }, include: { values: { orderBy: { sortKey: "asc" } } } }),
  ]);
  return (
    <AdminPage title="Add product" intro="Start with the basics. Photos, description and filters come on the next page.">
      <Card>
        <NewProductForm
          categories={categories.map((category) => ({ id: category.id, label: category.name, depth: category.depth }))}
          brands={brands.map((brand) => ({ id: brand.id, label: brand.name }))}
          sizes={sizeAttribute?.values.map((value) => ({ id: value.id, label: value.value })) ?? []}
        />
      </Card>
    </AdminPage>
  );
}
