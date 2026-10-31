import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { addCategory, moveCategory } from "@/lib/actions/admin/catalog";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm } from "@/components/admin/forms";
import { MoveButtons } from "@/components/admin/move-buttons";
import { Card, Field, StatusBadge, Table, TextInput, td, th } from "@/components/admin/ui";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Categories" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CategoriesPage({ searchParams }: Props) {
  await requireStaff("catalogue.manage");
  const { deleted } = await searchParams;
  const categories = await prisma.category.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: { id: true, name: true, path: true, parentId: true, depth: true, isActive: true, showInMenu: true, _count: { select: { products: true } } },
  });
  const byParent = new Map<string | null, typeof categories>();
  for (const category of categories) byParent.set(category.parentId, [...(byParent.get(category.parentId) ?? []), category]);
  const rows: { category: (typeof categories)[number]; first: boolean; last: boolean }[] = [];
  const walk = (parentId: string | null) => {
    const siblings = byParent.get(parentId) ?? [];
    siblings.forEach((category, index) => {
      rows.push({ category, first: index === 0, last: index === siblings.length - 1 });
      walk(category.id);
    });
  };
  walk(null);

  return (
    <AdminPage title="Categories" intro="The order here is the order in the menu and on the home page. Open a category to rename it, write its intro or add a subcategory." wide>
      {deleted && (
        <div className="mb-6">
          <FormAlert tone="success">Category deleted.</FormAlert>
        </div>
      )}
      <Table caption="Categories">
        <thead>
          <tr>
            <th className={th}>Category</th>
            <th className={th}>Address</th>
            <th className={`${th} text-right`}>Products</th>
            <th className={th}>Shown</th>
            <th className={th}>
              <span className="sr-only">Order</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ category, first, last }) => (
            <tr key={category.id} className="hover:bg-surface">
              <td className={td}>
                <Link
                  href={`/admin/categories/${category.id}`}
                  className={`hover:text-accent ${category.depth === 0 ? "font-semibold" : ""}`}
                  style={{ paddingInlineStart: `${category.depth * 1.5}rem` }}
                >
                  {category.depth > 0 && <span className="mr-1.5 text-muted">└</span>}
                  {category.name}
                </Link>
              </td>
              <td className={`${td} text-muted`}>/{category.path}</td>
              <td className={`${td} text-right tabular-nums`}>{category._count.products}</td>
              <td className={td}>
                {!category.isActive ? <StatusBadge tone="bad">Hidden</StatusBadge> : category.showInMenu ? <StatusBadge tone="good">Shop and menu</StatusBadge> : <StatusBadge>Shop only</StatusBadge>}
              </td>
              <td className={`${td} text-right`}>
                <MoveButtons move={moveCategory.bind(null, category.id)} label={category.name} first={first} last={last} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Card title="Add a main category" className="mt-8 max-w-xl">
        <AdminForm action={addCategory.bind(null, null)} submitLabel="Add category" primary>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <TextInput name="name" required minLength={2} maxLength={60} />
            </Field>
            <Field label="Web address" hint="Optional. Made from the name.">
              <TextInput name="slug" maxLength={60} />
            </Field>
          </div>
        </AdminForm>
      </Card>
    </AdminPage>
  );
}
