import type { ReactNode } from "react";
import { getStoreSettings } from "@/lib/data/store";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { WhatsappButton } from "./whatsapp-button";

/**
 * Header, page and footer render as one unit at request time from cached data (DECISIONS.md
 * 23), so the first paint already has all three in place and nothing shifts as parts arrive.
 */
export async function StoreChrome({ children }: { children: ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
      {settings.whatsapp && <WhatsappButton number={settings.whatsapp} />}
    </>
  );
}
