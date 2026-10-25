import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getStoreSettings } from "@/lib/data/store";
import { SkipLink } from "@/components/store/skip-link";
import { StoreChrome } from "@/components/store/store-chrome";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return {
    title: { default: settings.storeName, template: `%s | ${settings.storeName}` },
    applicationName: settings.storeName,
  };
}

export default function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <StoreChrome>{children}</StoreChrome>
    </>
  );
}
