"use client";

import { useState } from "react";
import { AdminForm } from "./forms";
import { Field, Select, TextInput } from "./ui";
import { createProduct } from "@/lib/actions/admin/products";

type Option = { id: string; label: string };

/** The first step of a new product: name, category, price and whether it comes in UK sizes. */
export function NewProductForm({ categories, brands, sizes }: { categories: (Option & { depth: number })[]; brands: Option[]; sizes: Option[] }) {
  const [kind, setKind] = useState<"single" | "sizes">("single");
  return (
    <AdminForm action={createProduct} submitLabel="Create draft and add photos" primary>
      <div className="grid gap-5">
        <Field label="Product name" hint="As shoppers will see it, e.g. “Tan leather Oxford shoes”.">
          <TextInput name="title" required minLength={3} maxLength={140} autoComplete="off" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select name="primaryCategoryId" required defaultValue="">
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {" ".repeat(category.depth)}
                  {category.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand" hint="Optional.">
            <Select name="brandId" defaultValue="">
              <option value="">No brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price (₹, incl. GST)">
            <TextInput name="price" inputMode="decimal" required placeholder="2499" />
          </Field>
          <Field label="Original price (₹)" hint="Optional. Shown struck through.">
            <TextInput name="compareAtPrice" inputMode="decimal" placeholder="2999" />
          </Field>
          <Field label={kind === "sizes" ? "Stock per size" : "Stock"}>
            <TextInput name="stock" type="number" min={0} step={1} defaultValue={0} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">How is it sold?</legend>
          <div className="flex flex-wrap gap-x-6">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="kind" value="single" checked={kind === "single"} onChange={() => setKind("single")} className="size-5 accent-[var(--link)]" />
              One item (watch, perfume, accessory)
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="kind" value="sizes" checked={kind === "sizes"} onChange={() => setKind("sizes")} className="size-5 accent-[var(--link)]" />
              In UK shoe sizes
            </label>
          </div>
        </fieldset>
        {kind === "sizes" && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Sizes</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <label key={size.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-line px-3 text-sm has-checked:border-ink has-checked:font-semibold">
                  <input type="checkbox" name="sizes" value={size.id} defaultChecked={/^UK (6|7|8|9|10|11)$/.test(size.label)} className="size-4 accent-[var(--link)]" />
                  {size.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <p className="text-sm text-muted">The product starts as a draft. Add photos and details next, then set it to Active to put it on sale.</p>
      </div>
    </AdminForm>
  );
}
