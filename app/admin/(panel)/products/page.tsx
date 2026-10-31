import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { brandOptions, categoryOptions, listProducts, PRODUCT_STATUS_LABELS, type ProductStatusName } from "@/lib/admin/products";
import { formatPrice } from "@/lib/format/money";
import { AdminPage } from "@/components/admin/admin-frame";
import { EmptyState, Pager, Select, StatusBadge, Table, TextInput, td, th } from "@/components/admin/ui";
import { PlusIcon, WarningIcon } from "@/components/icons";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Products" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");
const STATUS_TONES = { DRAFT: "neutral", ACTIVE: "good", SCHEDULED: "info", ARCHIVED: "bad" } as const;

export default async function AdminProductsPage({ searchParams }: Props) {
  const { user } = await requireStaff("catalogue.view");
  const params = await searchParams;
  const filters = {
    q: one(params.q).slice(0, 80),
    status: one(params.status),
    category: one(params.category),
    brand: one(params.brand),
    stock: one(params.stock),
    photo: one(params.photo),
    page: Math.max(1, Number.parseInt(one(params.page), 10) || 1),
  };
  const [{ products, total, pageCount, threshold }, categories, brands] = await Promise.all([listProducts(filters), categoryOptions(), brandOptions()]);
  const manage = can(user.role, "catalogue.manage");
  const filtered = Boolean(filters.q || filters.status || filters.category || filters.brand || filters.stock || filters.photo);
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (key !== "page" && value) query.set(key, String(value));
    if (page > 1) query.set("page", String(page));
    return `/admin/products${query.size ? `?${query}` : ""}`;
  };

  return (
    <AdminPage
      title="Products"
      intro={`${total} ${total === 1 ? "product" : "products"}${filtered ? " match these filters" : ""}.`}
      actions={
        manage && (
          <ButtonLink href="/admin/products/new">
            <PlusIcon size={18} />
            Add product
          </ButtonLink>
        )
      }
      wide
    >
      {one(params.deleted) && (
        <div className="mb-6">
          <FormAlert tone="success">Product deleted.</FormAlert>
        </div>
      )}
      {one(params.archived) && (
        <div className="mb-6">
          <FormAlert tone="info">That product has orders, so it was archived instead of deleted. It no longer shows in the shop.</FormAlert>
        </div>
      )}

      <form role="search" action="/admin/products" className="mb-4 grid gap-3 rounded-md border border-line bg-raised p-4 sm:grid-cols-2 lg:grid-cols-[2fr_repeat(5,minmax(0,1fr))_auto] lg:items-end">
        <label className="grid gap-1.5 text-sm font-medium">
          Search
          <TextInput name="q" type="search" defaultValue={filters.q} placeholder="Name, SKU or brand" />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Status
          <Select name="status" defaultValue={filters.status}>
            <option value="">Any</option>
            {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Category
          <Select name="category" defaultValue={filters.category}>
            <option value="">All</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {" ".repeat(category.depth)}
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Brand
          <Select name="brand" defaultValue={filters.brand}>
            <option value="">All</option>
            <option value="none">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Stock
          <Select name="stock" defaultValue={filters.stock}>
            <option value="">Any</option>
            <option value="low">Low (≤ {threshold})</option>
            <option value="out">Sold out</option>
          </Select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Photos
          <Select name="photo" defaultValue={filters.photo}>
            <option value="">Any</option>
            <option value="placeholder">Placeholder only</option>
            <option value="none">No photos</option>
          </Select>
        </label>
        <div className="flex gap-2">
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Filter
          </button>
          {filtered && (
            <Link href="/admin/products" className={buttonClasses("ghost", "md")}>
              Clear
            </Link>
          )}
        </div>
      </form>

      {products.length === 0 ? (
        <EmptyState>{filtered ? "No products match these filters." : "No products yet. Add your first one."}</EmptyState>
      ) : (
        <Table caption="Products">
          <thead>
            <tr>
              <th className={th}>
                <span className="sr-only">Photo</span>
              </th>
              <th className={th}>Product</th>
              <th className={th}>Status</th>
              <th className={th}>Stock</th>
              <th className={`${th} text-right`}>Price</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-surface">
                <td className={`${td} w-16`}>
                  <div className="photo-tile relative size-12 overflow-hidden rounded-sm">
                    {product.image && (
                      <Image
                        src={product.image.url}
                        alt=""
                        fill
                        sizes="48px"
                        className={product.image.url.endsWith(".svg") ? "object-cover mix-blend-normal" : "object-contain p-1"}
                      />
                    )}
                  </div>
                </td>
                <td className={td}>
                  <Link href={`/admin/products/${product.id}`} className="font-medium text-ink hover:text-accent">
                    {product.title}
                  </Link>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                    {[product.brand?.name, product.primaryCategory?.name].filter(Boolean).join(" · ")}
                    {product.isPlaceholderPhoto && (
                      <span className="inline-flex items-center gap-1 font-semibold text-ink">
                        <WarningIcon size={14} className="text-warning" />
                        Replace photo
                      </span>
                    )}
                    {product.isDemo && <span>demo</span>}
                  </span>
                </td>
                <td className={td}>
                  <StatusBadge tone={STATUS_TONES[product.status as ProductStatusName]}>{PRODUCT_STATUS_LABELS[product.status as ProductStatusName]}</StatusBadge>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  {product.variantCount === 0 ? (
                    <span className="text-muted">—</span>
                  ) : product.stock === 0 ? (
                    <span className="font-medium text-error">Sold out</span>
                  ) : (
                    <>
                      <span className="tabular-nums">{product.stock}</span>
                      {product.variantCount > 1 && <span className="text-muted"> in {product.variantCount} sizes</span>}
                      {product.lowVariants > 0 && (
                        <span className="flex items-center gap-1 text-xs text-ink">
                          <WarningIcon size={12} className="text-warning" />
                          {product.lowVariants === 1 && product.variantCount === 1 ? "Low" : `${product.lowVariants} low`}
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className={`${td} price text-right whitespace-nowrap`}>
                  {product.minPrice === product.maxPrice ? formatPrice(product.minPrice) : `${formatPrice(product.minPrice)} – ${formatPrice(product.maxPrice)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pager page={filters.page} pageCount={pageCount} href={pageHref} />
    </AdminPage>
  );
}
