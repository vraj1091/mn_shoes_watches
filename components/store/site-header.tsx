import Link from "next/link";
import { cookies } from "next/headers";
import { getStoreSettings } from "@/lib/data/store";
import { getCategoryNavigation } from "@/lib/data/navigation";
import { t } from "@/lib/i18n";
import { BagIcon, CaretDownIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "@/components/icons";
import { AnnouncementBar, ANNOUNCEMENT_COOKIE } from "./announcement-bar";
import { DesktopNav } from "./desktop-nav";
import { HeaderShell } from "./header-shell";
import { MobileNav } from "./mobile-nav";
import { SearchBox } from "./search/search-box";
import { searchLabels } from "./search/search-labels";
import { ThemeControl, ThemeControlInline } from "@/components/theme/theme-control";
import { BagButton } from "./shop/cart-drawer";
import { cartCount } from "@/lib/cart/cart";
import { getCustomerSession } from "@/lib/auth/session";
import { readShopperHash } from "@/lib/shopper/token";

const iconButton =
  "flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-surface hover:text-accent";

export async function SiteHeader() {
  // The header reads cookies on every request, so the signed-in state is never cached.
  const [settings, departments, cookieStore, shopper, session] = await Promise.all([
    getStoreSettings(),
    getCategoryNavigation(),
    cookies(),
    readShopperHash(),
    getCustomerSession(),
  ]);
  const account = session
    ? { label: t("common.yourAccount"), href: "/account" }
    : { label: t("common.signIn"), href: "/account/sign-in" };
  const bagCount = await cartCount(shopper);

  const showAnnouncement =
    settings.announcementEnabled &&
    Boolean(settings.announcementText) &&
    cookieStore.get(ANNOUNCEMENT_COOKIE)?.value !== String(settings.announcementVersion);

  const extraLinks = [
    { label: t("header.brands"), href: "/brands" },
    { label: t("header.sale"), href: "/sale", highlight: true },
  ];

  return (
    <>
      {showAnnouncement && (
        <AnnouncementBar
          text={settings.announcementText!}
          href={settings.announcementHref}
          version={settings.announcementVersion}
          dismissLabel={t("announcement.dismiss")}
          closeIcon={<CloseIcon size={18} />}
        />
      )}
      <HeaderShell>
        <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-2 px-4 transition-[height] duration-200 ease-out sm:px-6 xl:h-18 xl:gap-6 xl:px-8 xl:group-data-scrolled/header:h-15">
          <MobileNav
            departments={departments}
            extraLinks={extraLinks}
            accountLinks={[
              { label: account.label, href: account.href, icon: <UserIcon size={20} /> },
              { label: t("common.wishlist"), href: "/wishlist", icon: <HeartIcon size={20} /> },
            ]}
            labels={{
              open: t("header.openMenu"),
              title: t("header.menuTitle"),
              close: t("common.close"),
              shopAll: t("header.shopAll"),
              searchLabel: t("header.searchLabel"),
              searchPlaceholder: t("header.searchPlaceholder"),
            }}
            icons={{
              menu: <MenuIcon size={24} />,
              close: <CloseIcon size={22} />,
              caret: <CaretDownIcon size={18} />,
              search: <SearchIcon size={20} />,
            }}
            theme={<ThemeControlInline />}
          />

          <Link
            href="/"
            className="mr-auto flex min-h-11 items-center font-display text-lg leading-none tracking-tight whitespace-nowrap max-xl:absolute max-xl:left-1/2 max-xl:-translate-x-1/2 xl:mr-0 xl:text-2xl"
          >
            {settings.storeName}
          </Link>

          <div className="hidden flex-1 justify-center xl:flex">
            <DesktopNav
              departments={departments}
              extraLinks={extraLinks}
              label={t("header.primaryNav")}
              shopAllTemplate={t("header.shopAll")}
              caret={<CaretDownIcon size={14} />}
            />
          </div>

          <div className="ml-auto flex items-center xl:ml-0">
            <div className="mr-2 hidden w-64 2xl:block">
              <SearchBox labels={searchLabels()} size="header" icon={<SearchIcon size={18} />} />
            </div>
            <Link href="/search" aria-label={t("common.search")} className={`${iconButton} 2xl:hidden`}>
              <SearchIcon size={22} />
            </Link>
            {/* On phones the choice lives in the menu drawer, so the header icons never crowd the logo. */}
            <div className="max-xl:hidden">
              <ThemeControl />
            </div>
            <Link href={account.href} prefetch={false} aria-label={account.label} className={`${iconButton} relative max-xl:hidden`}>
              <UserIcon size={22} />
              {session && <span aria-hidden className="absolute right-2 bottom-2 size-2 rounded-full bg-success ring-2 ring-canvas" />}
            </Link>
            <Link href="/wishlist" prefetch={false} aria-label={t("common.wishlist")} className={`${iconButton} max-xl:hidden`}>
              <HeartIcon size={22} />
            </Link>
            <BagButton initialCount={bagCount} label={t("header.bagWithCount")} labelEmpty={t("header.bagEmpty")} icon={<BagIcon size={22} />} />
          </div>
        </div>
      </HeaderShell>
    </>
  );
}
