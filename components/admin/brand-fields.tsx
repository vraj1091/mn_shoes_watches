import { Checkbox, Field, TextArea, TextInput } from "./ui";

type Brand = {
  name: string;
  slug: string;
  intro: string | null;
  countryOfOrigin: string | null;
  website: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isActive: boolean;
  isFeatured: boolean;
};

/** The brand form's fields, shared by "Add brand" and the brand page. */
export function BrandFields({ brand }: { brand?: Brand }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name">
          <TextInput name="name" defaultValue={brand?.name} required maxLength={60} />
        </Field>
        <Field label="Web address" hint="The part after /brands/. Made from the name if empty.">
          <TextInput name="slug" defaultValue={brand?.slug} maxLength={60} />
        </Field>
      </div>
      <Field label="Intro" hint="A short paragraph shown on the brand page.">
        <TextArea name="intro" rows={4} defaultValue={brand?.intro ?? ""} maxLength={800} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Country of origin">
          <TextInput name="countryOfOrigin" defaultValue={brand?.countryOfOrigin ?? ""} maxLength={60} />
        </Field>
        <Field label="Website">
          <TextInput name="website" type="url" inputMode="url" defaultValue={brand?.website ?? ""} placeholder="https://" />
        </Field>
        <Field label="Page title for search engines" hint="Optional, up to 70 characters.">
          <TextInput name="metaTitle" defaultValue={brand?.metaTitle ?? ""} maxLength={70} />
        </Field>
        <Field label="Description for search engines" hint="Optional, up to 170 characters.">
          <TextInput name="metaDescription" defaultValue={brand?.metaDescription ?? ""} maxLength={170} />
        </Field>
      </div>
      <div className="grid gap-1">
        <Checkbox name="isActive" label="Show in the shop" defaultChecked={brand?.isActive ?? true} hint="Hidden brands have no page and are left out of the brand filter." />
        <Checkbox name="isFeatured" label="Feature on the Brands page" defaultChecked={brand?.isFeatured ?? false} />
      </div>
    </div>
  );
}
