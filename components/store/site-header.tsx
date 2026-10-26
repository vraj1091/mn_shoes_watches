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
import { readShopperHash } from "@/lib/shopper/token";

const iconButton =
  "flex size-11 items-center justify-center rounded-sm text-ink transition-colors hover:bg-surface hover:text-link";

export async function SiteHeader() {
  const [settings, departments, cookieStore, shopper] = await Promise.all([
    getStoreSettings(),
    getCategoryNavigation(),
    cookies(),
    readShopperHash(),
  ]);
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
        <div className="mx-auto flex h-14 max-w-screen-xl items-center gap-2 px-4 transition-[height] duration-200 ease-out sm:px-6 lg:h-18 lg:gap-6 lg:px-8 lg:group-data-scrolled/header:h-15">
          <MobileNav
            departments={departments}
            extraLinks={extraLinks}
            accountLinks={[
              { label: t("common.account"), href: "/account", icon: <UserIcon size={20} /> },
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
            className="mr-auto flex min-h-11 items-center font-display text-lg leading-none tracking-tight whitespace-nowrap max-lg:absolute max-lg:left-1/2 max-lg:-translate-x-1/2 lg:mr-0 lg:text-2xl"
          >
            {settings.storeName}
          </Link>

          <div className="hidden flex-1 justify-center lg:flex">
            <DesktopNav
              departments={departments}
              extraLinks={extraLinks}
              label={t("header.primaryNav")}
              shopAllTemplate={t("header.shopAll")}
              caret={<CaretDownIcon size={14} />}
            />
          </div>

          <div className="ml-auto flex items-center lg:ml-0">
            <div className="mr-2 hidden w-64 2xl:block">
              <SearchBox labels={searchLabels()} size="header" icon={<SearchIcon size={18} />} />
            </div>
            <Link href="/search" aria-label={t("common.search")} className={`${iconButton} 2xl:hidden`}>
              <SearchIcon size={22} />
            </Link>
            {/* On phones the choice lives in the menu drawer, so the header icons never crowd the logo. */}
            <div className="max-lg:hidden">
              <ThemeControl />
            </div>
            <Link href="/account" prefetch={false} aria-label={t("common.account")} className={`${iconButton} max-lg:hidden`}>
              <UserIcon size={22} />
            </Link>
            <Link href="/wishlist" prefetch={false} aria-label={t("common.wishlist")} className={`${iconButton} max-lg:hidden`}>
              <HeartIcon size={22} />
            </Link>
            <BagButton initialCount={bagCount} label={t("header.bagWithCount")} labelEmpty={t("header.bagEmpty")} icon={<BagIcon size={22} />} />
          </div>
        </div>
      </HeaderShell>
    </>
  );
}
