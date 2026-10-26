import type { Metadata } from "next";
import Link from "next/link";
import { buildCartView } from "@/lib/cart/cart";
import { STATES } from "@/lib/commerce/india";
import { getStoreSettings } from "@/lib/data/store";
import { razorpayKeys } from "@/lib/payments/razorpay";
import { readShopperHash } from "@/lib/shopper/token";
import { t } from "@/lib/i18n";
import { ShieldIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { CheckoutForm, type CheckoutLabels } from "@/components/store/shop/checkout-form";
import { bagLabels } from "@/components/store/shop/labels";

export const metadata: Metadata = { title: t("checkout.title"), robots: { index: false, follow: false } };

const KEYS = [
  "contact", "email", "emailHint", "phone", "phoneHint", "address", "name", "line1", "line2", "landmark", "city", "state", "statePick",
  "pin", "deliveryBy", "payment", "cod", "codNote", "codUnavailable", "online", "onlineNote", "onlineDemo", "onlineDemoNote", "note",
  "summary", "placeOrder", "placing", "pay", "terms", "errorFields", "errorEmpty", "errorStock", "errorCod", "errorPayment", "errorBusy",
  "paymentCancelled", "paymentFailed", "fieldEmail", "fieldPhone", "fieldName", "fieldLine1", "fieldCity", "fieldState", "fieldPin", "secure",
] as const;

export default async function CheckoutPage() {
  const [view, settings] = await Promise.all([buildCartView(await readShopperHash(), "PREPAID"), getStoreSettings()]);
  const labels = Object.fromEntries(KEYS.map((key) => [key, t(`checkout.${key}`)])) as CheckoutLabels;

  return (
    <div className="mx-auto max-w-screen-xl px-4 pt-8 pb-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl lg:text-5xl">{t("checkout.title")}</h1>
        <Link href="/cart" className="text-sm text-link underline underline-offset-4">
          {t("checkout.backToBag")}
        </Link>
      </div>
      {view.count === 0 ? (
        <div className="mt-8 rounded-md bg-surface px-6 py-12 text-center">
          <p className="text-lg font-medium">{t("bag.empty")}</p>
          <Link href="/" className={buttonClasses("primary", "md", "mt-6")}>
            {t("bag.startShopping")}
          </Link>
        </div>
      ) : (
        <CheckoutForm
          initial={view}
          labels={labels}
          bag={bagLabels()}
          states={STATES}
          cod={{ enabled: settings.codEnabled, fee: settings.codFee, max: settings.codMaxOrder }}
          razorpay={razorpayKeys() !== null}
          lockIcon={<ShieldIcon size={14} />}
        />
      )}
    </div>
  );
}
