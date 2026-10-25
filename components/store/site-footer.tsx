import Link from "next/link";
import { getPrimaryLocation, getStoreSettings, type SocialLinks } from "@/lib/data/store";
import { getCategoryNavigation } from "@/lib/data/navigation";
import { describeOpeningHours } from "@/lib/format/hours";
import { t } from "@/lib/i18n";
import {
  AutoThemeIcon,
  FacebookIcon,
  InstagramIcon,
  MoonIcon,
  SunIcon,
  XLogoIcon,
  YoutubeIcon,
} from "@/components/icons";
import { NewsletterForm } from "./newsletter-form";
import { ThemeSwitch } from "./theme-switch";

const PAYMENT_METHODS = ["UPI", "Visa", "Mastercard", "RuPay", "Net banking"];

const SOCIAL: { key: keyof SocialLinks; label: string; Icon: typeof InstagramIcon }[] = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon },
  { key: "facebook", label: "Facebook", Icon: FacebookIcon },
  { key: "youtube", label: "YouTube", Icon: YoutubeIcon },
  { key: "x", label: "X", Icon: XLogoIcon },
];

const heading = "mb-4 text-xs font-semibold tracking-[0.12em] text-muted uppercase";
const link = "inline-block py-1.5 text-sm text-fg hover:text-accent";

export async function SiteFooter() {
  const [settings, location, departments] = await Promise.all([
    getStoreSettings(),
    getPrimaryLocation(),
    getCategoryNavigation(),
  ]);
  const year = new Date().getFullYear();
  const hours = location ? describeOpeningHours(location.openingHours) : [];
  const socials = SOCIAL.filter(({ key }) => settings.socialLinks[key]);

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-screen-xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <section aria-labelledby="footer-visit" className="lg:col-span-4">
          <h2 id="footer-visit" className="font-display text-3xl">
            {t("footer.visit")}
          </h2>
          {location && (
            <address className="mt-5 space-y-1 text-base not-italic">
              <p className="font-medium">{location.name}</p>
              <p>{[location.line1, location.line2].filter(Boolean).join(", ")}</p>
              {location.landmark && <p className="text-muted">{location.landmark}</p>}
              <p>
                {location.city}, {location.state} {location.pinCode}
              </p>
            </address>
          )}
          <ul className="mt-5 space-y-1 text-sm">
            <li>
              <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className={link}>
                {t("footer.call", { phone: settings.phone })}
              </a>
            </li>
            {settings.whatsapp && (
              <li>
                <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={link}>
                  {t("footer.whatsapp")}
                </a>
              </li>
            )}
            {location?.mapUrl && (
              <li>
                <a href={location.mapUrl} target="_blank" rel="noopener noreferrer" className={link}>
                  {t("footer.directions")}
                </a>
              </li>
            )}
          </ul>
          {hours.length > 0 && (
            <div className="mt-5">
              <p className="text-sm text-muted">{t("footer.hours")}</p>
              <ul className="mt-1 text-sm tabular-nums">
                {hours.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-5">
        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className={heading}>
            {t("footer.shop")}
          </h2>
          <ul>
            {departments.map((dept) => (
              <li key={dept.id}>
                <Link href={dept.href} className={link}>
                  {dept.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/sale" className={link}>
                {t("header.sale")}
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className={heading}>
            {t("footer.help")}
          </h2>
          <ul>
            <li>
              <Link href="/track" className={link}>
                {t("footer.trackOrder")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className={link}>
                {t("footer.faq")}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={link}>
                {t("footer.contactUs")}
              </Link>
            </li>
            <li>
              <Link href="/about" className={link}>
                {t("footer.about")}
              </Link>
            </li>
            {location && (
              <li>
                <Link href={`/stores/${location.slug}`} className={link}>
                  {t("footer.stores")}
                </Link>
              </li>
            )}
          </ul>
        </nav>

        <nav aria-labelledby="footer-policies">
          <h2 id="footer-policies" className={heading}>
            {t("footer.policies")}
          </h2>
          <ul>
            <li>
              <Link href="/policies/shipping" className={link}>
                {t("footer.shippingPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/policies/returns-and-exchanges" className={link}>
                {t("footer.returnsPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/policies/warranty" className={link}>
                {t("footer.warrantyPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/policies/privacy" className={link}>
                {t("footer.privacyPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/policies/terms" className={link}>
                {t("footer.terms")}
              </Link>
            </li>
          </ul>
        </nav>
        </div>

        <section aria-labelledby="footer-newsletter" className="lg:col-span-3">
          <h2 id="footer-newsletter" className="text-base font-semibold">
            {t("footer.newsletterTitle")}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">{t("footer.newsletterIntro")}</p>
          <NewsletterForm
            labels={{
              email: t("footer.newsletterEmail"),
              submit: t("footer.newsletterSubmit"),
              done: t("footer.newsletterDone"),
              invalid: t("footer.newsletterInvalid"),
              busy: t("footer.newsletterBusy"),
              error: t("footer.newsletterError"),
            }}
          />
        </section>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-sm text-muted">{t("footer.weAccept")}</p>
              <ul className="flex flex-wrap gap-2">
                {[...PAYMENT_METHODS, t("footer.cashOnDelivery")].map((method) => (
                  <li key={method} className="rounded-sm border border-line px-2.5 py-1 text-xs font-medium text-fg">
                    {method}
                  </li>
                ))}
              </ul>
            </div>
            {socials.length > 0 && (
              <div>
                <p className="mb-1 text-sm text-muted">{t("footer.followUs")}</p>
                <ul className="-ml-3 flex">
                  {socials.map(({ key, label, Icon }) => (
                    <li key={key}>
                      <a
                        href={settings.socialLinks[key]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-11 items-center justify-center rounded-sm text-fg hover:text-accent"
                      >
                        <Icon size={22} label={label} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <ThemeSwitch
            legend={t("footer.theme")}
            options={[
              { value: "system", label: t("footer.themeSystem"), icon: <AutoThemeIcon size={16} /> },
              { value: "light", label: t("footer.themeLight"), icon: <SunIcon size={16} /> },
              { value: "dark", label: t("footer.themeDark"), icon: <MoonIcon size={16} /> },
            ]}
          />
        </div>
        <div className="mx-auto flex max-w-screen-xl flex-col gap-1 px-4 pb-10 text-xs text-muted sm:px-6 lg:flex-row lg:justify-between lg:px-8">
          <p>{t("footer.copyright", { year, name: settings.legalName ?? settings.storeName })}</p>
          {settings.gstin && <p className="tabular-nums">{t("footer.gstin", { gstin: settings.gstin })}</p>}
        </div>
      </div>
    </footer>
  );
}
