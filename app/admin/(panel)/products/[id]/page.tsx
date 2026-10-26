import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { attributesForCategory, brandOptions, categoryOptions, getProductForEdit, PRODUCT_STATUS_LABELS, type ProductStatusName } from "@/lib/admin/products";
import {
  addSizes,
  deleteProduct,
  duplicateProduct,
  updateProductAttributes,
  updateProductDetails,
  updateProductSeo,
  updateVariants,
} from "@/lib/actions/admin/products";
import { mediaUrl } from "@/lib/media/url";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { ProductPhotos } from "@/components/admin/product-photos";
import { Card, Checkbox, Field, Select, StatusBadge, TextArea, TextInput, td, th } from "@/components/admin/ui";
import { ArrowLeftIcon, StoreIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, select: { title: true } });
  return { title: product?.title ?? "Product" };
}

const BADGES = ["Bestseller", "New", "Limited stock", "Online exclusive"];
const STATUS_TONES = { DRAFT: "neutral", ACTIVE: "good", SCHEDULED: "info", ARCHIVED: "bad" } as const;

const rupees = (paise: number | null) => (paise === null ? "" : paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

/** The saved description back as plain paragraphs separated by blank lines. */
function paragraphsOf(html: string | null): string {
  if (!html) return "";
  return html
    .split(/<\/p>/i)
    .map((part) =>
      part
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim(),
    )
    .filter(Boolean)
    .join("\n\n");
}

const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : []);
const specList = (value: unknown): { label: string; value: string }[] =>
  Array.isArray(value) ? value.filter((entry): entry is { label: string; value: string } => typeof entry?.label === "string" && typeof entry?.value === "string") : [];

export default async function EditProductPage({ params, searchParams }: Props) {
  const { user } = await requireStaff("catalogue.view");
  const { id } = await params;
  const query = await searchParams;
  const product = await getProductForEdit(id);
  if (!product) notFound();

  const manage = can(user.role, "catalogue.manage");
  const [categories, brands, attributes, sizeAttribute] = await Promise.all([
    categoryOptions(),
    brandOptions(),
    attributesForCategory(product.primaryCategoryId),
    prisma.attribute.findFirst({ where: { storeId: DEFAULT_STORE_ID, code: "size_uk" }, include: { values: { orderBy: { sortKey: "asc" } } } }),
  ]);
  const status = product.status as ProductStatusName;
  const axisIds = new Set(product.options.map((option) => option.attributeId));
  const sizeOption = product.options.find((option) => option.attribute.code === "size_uk");
  const sizesHad = new Set(product.variants.flatMap((variant) => variant.options.map((entry) => entry.valueId)));
  const missingSizes = sizeOption ? (sizeAttribute?.values.filter((value) => !sizesHad.has(value.id)) ?? []) : [];
  const chosen = new Set(product.attributeValues.flatMap((entry) => (entry.valueId ? [entry.valueId] : [])));
  const numbers = new Map(product.attributeValues.flatMap((entry) => (entry.numberValue !== null ? [[entry.attributeId, entry.numberValue] as const] : [])));
  const badges = stringList(product.badges);
  const customBadges = badges.filter((badge) => !BADGES.includes(badge));
  const linkedCategories = new Set(product.categories.map((entry) => entry.categoryId));
  const photos = product.media
    .filter((entry) => entry.media.key)
    .map((entry) => ({ id: entry.id, url: mediaUrl(entry.media.key!), alt: entry.media.alt ?? "", isSvg: entry.media.mimeType === "image/svg+xml" }));

  return (
    <AdminPage
      title={product.title}
      intro={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={STATUS_TONES[status]}>{PRODUCT_STATUS_LABELS[status]}</StatusBadge>
          {product.isDemo && <StatusBadge tone="badge">Demo product</StatusBadge>}
          <span className="text-sm">/product/{product.slug}</span>
        </span>
      }
      actions={
        <div className="flex flex-wrap items-start gap-2">
          <ButtonLink href="/admin/products" variant="ghost" size="sm">
            <ArrowLeftIcon size={16} />
            All products
          </ButtonLink>
          {status === "ACTIVE" && (
            <ButtonLink href={`/product/${product.slug}`} variant="secondary" size="sm" target="_blank">
              <StoreIcon size={16} />
              View in shop
            </ButtonLink>
          )}
          {manage && (
            <ConfirmButton
              action={duplicateProduct.bind(null, product.id)}
              label="Duplicate"
              confirmLabel="Make a copy"
              question="Copy this product as a draft, with the same photos and prices but no stock?"
              variant="secondary"
            />
          )}
        </div>
      }
      wide
    >
      {query.created && (
        <div className="mb-6">
          <FormAlert tone="success">Draft created. Add photos and a description, then set the status to Active to put it on sale.</FormAlert>
        </div>
      )}
      {query.duplicated && (
        <div className="mb-6">
          <FormAlert tone="success">This is the copy. Rename it, set stock, then make it Active.</FormAlert>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card title="Photos" actions={<span className="text-xs text-muted">Drag or use the arrows to reorder</span>}>
            {manage ? (
              <ProductPhotos productId={product.id} photos={photos} placeholder={product.isPlaceholderPhoto} />
            ) : (
              <p className="text-sm text-muted">{photos.length} photos.</p>
            )}
          </Card>

          <Card title={product.variants.length > 1 || sizeOption ? "Sizes, prices and stock" : "Price and stock"}>
            <AdminForm action={updateVariants.bind(null, product.id)} submitLabel="Save prices and stock">
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-sm">
                  <caption className="sr-only">Sizes and options</caption>
                  <thead>
                    <tr>
                      <th className={th}>{sizeOption ? "Size" : "Option"}</th>
                      <th className={th}>Price ₹</th>
                      <th className={th}>Was ₹</th>
                      <th className={th}>Stock</th>
                      <th className={th}>On sale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => {
                      const label = variant.title === "Default" ? "Item" : variant.title;
                      return (
                        <tr key={variant.id}>
                          <td className={td}>
                            <span className="block font-medium whitespace-nowrap">{label}</span>
                            <label className="sr-only" htmlFor={`f-sku-${variant.id}`}>
                              SKU for {label}
                            </label>
                            <input id={`f-sku-${variant.id}`} name={`sku-${variant.id}`} defaultValue={variant.sku} className="mt-1 w-32 rounded-sm border border-line bg-canvas px-2 py-1 font-mono text-xs" />
                          </td>
                          <td className={td}>
                            <label className="sr-only" htmlFor={`f-price-${variant.id}`}>
                              Price for {label}
                            </label>
                            <input id={`f-price-${variant.id}`} name={`price-${variant.id}`} defaultValue={rupees(variant.price)} inputMode="decimal" required className="min-h-10 w-24 rounded-sm border border-line-strong bg-canvas px-2 tabular-nums" />
                          </td>
                          <td className={td}>
                            <label className="sr-only" htmlFor={`f-compare-${variant.id}`}>
                              Original price for {label}
                            </label>
                            <input id={`f-compare-${variant.id}`} name={`compare-${variant.id}`} defaultValue={rupees(variant.compareAtPrice)} inputMode="decimal" className="min-h-10 w-24 rounded-sm border border-line-strong bg-canvas px-2 tabular-nums" />
                          </td>
                          <td className={td}>
                            <label className="sr-only" htmlFor={`f-stock-${variant.id}`}>
                              Stock for {label}
                            </label>
                            <input id={`f-stock-${variant.id}`} name={`stock-${variant.id}`} type="number" min={0} step={1} defaultValue={variant.stockOnHand} className="min-h-10 w-20 rounded-sm border border-line-strong bg-canvas px-2 tabular-nums" />
                          </td>
                          <td className={td}>
                            <input type="checkbox" name={`active-${variant.id}`} defaultChecked={variant.isActive} aria-label={`${label} on sale`} className="size-5 accent-[var(--link)]" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted">Prices include GST. Leave “Was” empty when there is no discount. Stock changes are logged.</p>
            </AdminForm>
            {manage && missingSizes.length > 0 && (
              <details className="mt-6 rounded-sm border border-line">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">Add sizes</summary>
                <div className="border-t border-line p-3">
                  <AdminForm action={addSizes.bind(null, product.id)} submitLabel="Add sizes">
                    <div className="flex flex-wrap gap-2">
                      {missingSizes.map((size) => (
                        <label key={size.id} className="flex min-h-11 items-center gap-2 rounded-sm border border-line px-3 text-sm has-checked:border-ink has-checked:font-semibold">
                          <input type="checkbox" name="sizes" value={size.id} className="size-4 accent-[var(--link)]" />
                          {size.value}
                        </label>
                      ))}
                    </div>
                    <Field label="Stock for each new size" className="mt-4 max-w-40">
                      <TextInput name="stock" type="number" min={0} defaultValue={0} />
                    </Field>
                  </AdminForm>
                </div>
              </details>
            )}
          </Card>

          <Card title="Details">
            <AdminForm action={updateProductDetails.bind(null, product.id)}>
              <div className="grid gap-5">
                <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
                  <Field label="Name">
                    <TextInput name="title" defaultValue={product.title} required minLength={3} maxLength={140} />
                  </Field>
                  <Field label="Status" hint="Active = on sale in the shop.">
                    <Select name="status" defaultValue={status === "SCHEDULED" ? "DRAFT" : status}>
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Web address" hint="The part after /product/. Changing it breaks links shared earlier.">
                  <TextInput name="slug" defaultValue={product.slug} maxLength={90} pattern="[a-z0-9\-]+" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-3">
                  <Field label="Main category">
                    <Select name="primaryCategoryId" defaultValue={product.primaryCategoryId ?? ""} required>
                      <option value="" disabled>
                        Choose
                      </option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {" ".repeat(category.depth)}
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Brand">
                    <Select name="brandId" defaultValue={product.brandId ?? ""}>
                      <option value="">No brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="For">
                    <Select name="gender" defaultValue={product.gender ?? ""}>
                      <option value="">Not set</option>
                      <option value="MEN">Men</option>
                      <option value="WOMEN">Women</option>
                      <option value="UNISEX">Unisex</option>
                    </Select>
                  </Field>
                </div>
                <details className="rounded-sm border border-line">
                  <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
                    Also show in other categories ({Math.max(0, linkedCategories.size - (product.primaryCategoryId ? 1 : 0))})
                  </summary>
                  <div className="grid max-h-72 gap-x-4 overflow-y-auto border-t border-line px-3 py-2 sm:grid-cols-2">
                    {categories.map((category) => (
                      <label key={category.id} className="flex min-h-9 items-center gap-2 text-sm" style={{ paddingInlineStart: `${category.depth * 1}rem` }}>
                        <input
                          type="checkbox"
                          name="categoryIds"
                          value={category.id}
                          defaultChecked={linkedCategories.has(category.id) && category.id !== product.primaryCategoryId}
                          className="size-4 accent-[var(--link)]"
                        />
                        {category.name}
                      </label>
                    ))}
                  </div>
                </details>
                <Field label="Summary" hint="One plain sentence saying what it is. Shown under the name and used by search engines.">
                  <TextArea name="summary" rows={2} defaultValue={product.summary ?? ""} maxLength={300} />
                </Field>
                <Field label="Description" hint="Leave a blank line between paragraphs.">
                  <TextArea name="description" rows={7} defaultValue={paragraphsOf(product.descriptionHtml)} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Highlights" hint="One per line, up to 8.">
                    <TextArea name="highlights" rows={5} defaultValue={stringList(product.highlights).join("\n")} />
                  </Field>
                  <Field label="Specifications" hint="One per line, as “Label: value”.">
                    <TextArea name="specs" rows={5} defaultValue={specList(product.specs).map((spec) => `${spec.label}: ${spec.value}`).join("\n")} />
                  </Field>
                </div>
                <Field label="Care">
                  <TextArea name="care" rows={2} defaultValue={product.care ?? ""} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
                  <Field label="Warranty" hint="E.g. “2-year manufacturer warranty on the movement”.">
                    <TextInput name="warranty" defaultValue={product.warranty ?? ""} maxLength={300} />
                  </Field>
                  <Field label="Warranty months">
                    <TextInput name="warrantyMonths" type="number" min={0} max={999} defaultValue={product.warrantyMonths ?? ""} />
                  </Field>
                </div>
                <fieldset>
                  <legend className="mb-1 text-sm font-medium">Badges</legend>
                  <p className="mb-2 text-xs text-muted">Shown on the product card. Up to three.</p>
                  <div className="flex flex-wrap gap-x-5">
                    {BADGES.map((badge) => (
                      <label key={badge} className="flex min-h-11 items-center gap-2 text-sm">
                        <input type="checkbox" name="badges" value={badge} defaultChecked={badges.includes(badge)} className="size-4 accent-[var(--link)]" />
                        {badge}
                      </label>
                    ))}
                  </div>
                  <label htmlFor="custom-badges" className="mt-2 block text-sm">
                    Other badges, separated by commas
                  </label>
                  <TextInput id="custom-badges" name="customBadge" defaultValue={customBadges.join(", ")} maxLength={80} className="mt-1" />
                </fieldset>
                <Field label="Video" hint="Optional YouTube or Vimeo link, shown after the photos.">
                  <TextInput name="videoUrl" type="url" inputMode="url" defaultValue={product.videoUrl ?? ""} placeholder="https://www.youtube.com/watch?v=…" />
                </Field>
                <Checkbox name="isFeatured" label="Feature on the home page" defaultChecked={product.isFeatured} />
              </div>
            </AdminForm>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          {attributes.filter((attribute) => !axisIds.has(attribute.id)).length > 0 && (
            <Card title="Filters">
              <p className="mb-4 text-sm text-muted">What shoppers can filter by on category pages. They follow the main category; save Details first if you change it.</p>
              <AdminForm action={updateProductAttributes.bind(null, product.id)} submitLabel="Save filters">
                <div className="grid gap-5">
                  {attributes
                    .filter((attribute) => !axisIds.has(attribute.id))
                    .map((attribute) =>
                      attribute.type === "NUMBER" ? (
                        <Field key={attribute.id} label={`${attribute.name}${attribute.unit ? ` (${attribute.unit})` : ""}`}>
                          <TextInput name={`attr-${attribute.code}`} type="number" step="any" min={0} defaultValue={numbers.get(attribute.id) ?? ""} />
                        </Field>
                      ) : attribute.type === "MULTI_SELECT" ? (
                        <fieldset key={attribute.id}>
                          <legend className="mb-2 text-sm font-medium">{attribute.name}</legend>
                          <div className="flex max-h-40 flex-wrap gap-x-4 overflow-y-auto">
                            {attribute.values.map((value) => (
                              <label key={value.id} className="flex min-h-9 items-center gap-2 text-sm">
                                <input type="checkbox" name={`attr-${attribute.code}`} value={value.id} defaultChecked={chosen.has(value.id)} className="size-4 accent-[var(--link)]" />
                                {value.value}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      ) : attribute.type === "SELECT" ? (
                        <Field key={attribute.id} label={attribute.name}>
                          <Select name={`attr-${attribute.code}`} defaultValue={attribute.values.find((value) => chosen.has(value.id))?.id ?? ""}>
                            <option value="">Not set</option>
                            {attribute.values.map((value) => (
                              <option key={value.id} value={value.id}>
                                {value.value}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : null,
                    )}
                </div>
              </AdminForm>
            </Card>
          )}

          <Card title="Search engines">
            <AdminForm action={updateProductSeo.bind(null, product.id)}>
              <div className="grid gap-5">
                <Field label="Page title" hint="Up to 70 characters. Leave empty to use the product name.">
                  <TextInput name="metaTitle" defaultValue={product.metaTitle ?? ""} maxLength={70} />
                </Field>
                <Field label="Description" hint="Up to 170 characters. Leave empty to use the summary.">
                  <TextArea name="metaDescription" rows={3} defaultValue={product.metaDescription ?? ""} maxLength={170} />
                </Field>
                <Checkbox name="noindex" label="Hide from search engines" defaultChecked={product.noindex} hint="The page stays in the shop but Google is asked not to list it." />
              </div>
            </AdminForm>
          </Card>

          {manage && (
            <Card title="Delete">
              <p className="mb-3 text-sm text-muted">
                {product._count.orderItems > 0
                  ? `This product is on ${product._count.orderItems} order ${product._count.orderItems === 1 ? "line" : "lines"}, so it will be archived (hidden from the shop) rather than deleted.`
                  : "Deletes the product, its sizes and its reviews. Photos stay in the library."}
              </p>
              <ConfirmButton
                action={deleteProduct.bind(null, product.id)}
                label={product._count.orderItems > 0 ? "Archive product" : "Delete product"}
                confirmLabel={product._count.orderItems > 0 ? "Archive" : "Delete for good"}
                question={product._count.orderItems > 0 ? "Hide this product from the shop?" : "Delete this product? This cannot be undone."}
              />
            </Card>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
