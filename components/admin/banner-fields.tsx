import { ImagePicker, type PickableImage } from "./image-picker";
import { Checkbox, Field, TextInput } from "./ui";

export type BannerDefaults = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: PickableImage | null;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export function BannerFields({ banner, library }: { banner: BannerDefaults; library: PickableImage[] }) {
  return (
    <div className="grid gap-5">
      <Field label="Headline" hint="Short and specific, e.g. “Watches for every wrist”.">
        <TextInput name="title" defaultValue={banner.title} required minLength={3} maxLength={80} />
      </Field>
      <Field label="Text" hint="Optional. One sentence under the headline.">
        <TextInput name="subtitle" defaultValue={banner.subtitle} maxLength={200} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Button text" hint="Optional, e.g. “Shop watches”.">
          <TextInput name="ctaLabel" defaultValue={banner.ctaLabel} maxLength={30} />
        </Field>
        <Field label="Button link" hint="A shop address like /watches or /sale.">
          <TextInput name="ctaHref" defaultValue={banner.ctaHref} placeholder="/watches" />
        </Field>
      </div>
      <ImagePicker name="imageId" initial={banner.image} library={library} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Show from" hint="Optional.">
          <TextInput name="startsAt" type="date" defaultValue={banner.startsAt} />
        </Field>
        <Field label="Show until" hint="Optional. Includes this whole day (IST).">
          <TextInput name="endsAt" type="date" defaultValue={banner.endsAt} />
        </Field>
      </div>
      <Checkbox name="isActive" label="Show on the home page" defaultChecked={banner.isActive} />
    </div>
  );
}
