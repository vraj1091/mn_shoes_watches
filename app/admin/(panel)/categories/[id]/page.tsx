import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { addCategory, deleteCategory, updateCategory } from "@/lib/actions/admin/catalog";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { Card, Checkbox, Field, TextArea, TextInput } from "@/components/admin/ui";
import { ArrowLeftIcon, StoreIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id }, select: { name: true } });
  return { title: category?.name ?? "Category" };
}

export default async function CategoryPage({ params }: Props) {
  await requireStaff("catalogue.manage");
  const { id } = await params;
  const category = await prisma.category.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    include: {
      parent: { select: { id: true, name: true } },
      children: { orderBy: { position: "asc" }, select: { id: true, name: true, isActive: true } },
      _count: { select: { products: true, primaryProducts: true } },
    },
  });
  if (!category) notFound();
  const empty = category.children.length === 0 && category._count.products === 0 && category._count.primaryProducts === 0;

  return (
    <AdminPage
      title={category.name}
      intro={
        <>
          /{category.path}
          {category.parent && (
            <>
              {" "}
              · in{" "}
              <Link href={`/admin/categories/${category.parent.id}`} className="text-link hover:text-accent underline underline-offset-4">
                {category.parent.name}
              </Link>
            </>
          )}
        </>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/categories" variant="ghost" size="sm">
            <ArrowLeftIcon size={16} />
            All categories
          </ButtonLink>
          {category.isActive && (
            <ButtonLink href={`/${category.path}`} variant="secondary" size="sm" target="_blank">
              <StoreIcon size={16} />
              View in shop
            </ButtonLink>
          )}
          <ButtonLink href={`/admin/products?category=${category.id}`} variant="secondary" size="sm">
            {category._count.products} products
          </ButtonLink>
        </div>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <Card title="Category">
          <AdminForm action={updateCategory.bind(null, category.id)} primary>
            <div className="grid gap-5">
              <Field label="Name">
                <TextInput name="name" defaultValue={category.name} required minLength={2} maxLength={60} />
              </Field>
              <Field label="Intro" hint="60–120 words shown above the products. Start by saying plainly what the category is.">
                <TextArea name="intro" rows={5} defaultValue={category.intro ?? ""} maxLength={1200} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Page title for search engines" hint="Optional, up to 70 characters.">
                  <TextInput name="metaTitle" defaultValue={category.metaTitle ?? ""} maxLength={70} />
                </Field>
                <Field label="Description for search engines" hint="Optional, up to 170 characters.">
                  <TextInput name="metaDescription" defaultValue={category.metaDescription ?? ""} maxLength={170} />
                </Field>
              </div>
              <div className="grid gap-1">
                <Checkbox name="isActive" label="Show in the shop" defaultChecked={category.isActive} hint="Hidden categories return “not found” and leave the menu." />
                <Checkbox name="showInMenu" label="Show in the menu" defaultChecked={category.showInMenu} />
              </div>
            </div>
          </AdminForm>
        </Card>

        <Card title="Subcategories">
          {category.children.length > 0 ? (
            <ul className="mb-6 flex flex-wrap gap-2">
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link href={`/admin/categories/${child.id}`} className="inline-flex min-h-11 items-center rounded-sm border border-line px-3 text-sm hover:border-ink">
                    {child.name}
                    {!child.isActive && <span className="ml-1.5 text-xs text-muted">(hidden)</span>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-sm text-muted">No subcategories yet.</p>
          )}
          {category.depth < 2 ? (
            <AdminForm action={addCategory.bind(null, category.id)} submitLabel="Add subcategory">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="New subcategory">
                  <TextInput name="name" required minLength={2} maxLength={60} />
                </Field>
                <Field label="Web address" hint={`Optional. Becomes /${category.path}/…`}>
                  <TextInput name="slug" maxLength={60} />
                </Field>
              </div>
            </AdminForm>
          ) : (
            <p className="text-sm text-muted">Categories go three levels deep at most.</p>
          )}
        </Card>

        <Card title="Delete">
          <p className="mb-3 text-sm text-muted">
            {empty ? "This category is empty and can be deleted." : "Only an empty category can be deleted. Move its products and subcategories first, or hide it instead."}
          </p>
          {empty && <ConfirmButton action={deleteCategory.bind(null, category.id)} label="Delete category" confirmLabel="Delete for good" question={`Delete ${category.name}?`} />}
        </Card>
      </div>
    </AdminPage>
  );
}
