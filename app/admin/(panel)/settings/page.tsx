import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import {
  removeAllDemoData,
  saveAnnouncement,
  saveDelivery,
  saveInvoiceSettings,
  saveReturns,
  saveShopAddress,
  saveStoreDetails,
} from "@/lib/actions/admin/settings";
import { STATES } from "@/lib/commerce/india";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm, ConfirmButton } from "@/components/admin/forms";
import { Card, Checkbox, Field, Select, TextArea, TextInput, td, th } from "@/components/admin/ui";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Settings" };

const rupees = (paise: number | null) => (paise === null ? "" : paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));

/** Values the first seed wrote as placeholders ("[shop email]") show as empty fields to fill in. */
const filled = (value: string | null | undefined) => (!value || /^\[.*\]$/.test(value) || value.replace(/\D/g, "").replace(/^91/, "") === "0000000000" ? "" : value);

const SECTIONS = [
  ["store", "Store details"],
  ["address", "Shop address"],
  ["delivery", "Delivery and COD"],
  ["returns", "Returns and stock"],
  ["announcement", "Announcement bar"],
  ["invoices", "Invoices"],
  ["demo-data", "Demo data"],
] as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SettingsPage({ searchParams }: Props) {
  await requireStaff("settings.manage");
  const { demoRemoved } = await searchParams;
  const [settings, location, zones, demo] = await Promise.all([
    prisma.storeSettings.findUniqueOrThrow({ where: { storeId: DEFAULT_STORE_ID } }),
    prisma.storeLocation.findFirst({ where: { storeId: DEFAULT_STORE_ID }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
    prisma.shippingZone.findMany({ where: { storeId: DEFAULT_STORE_ID }, orderBy: { position: "asc" }, include: { rates: { orderBy: { position: "asc" } } } }),
    Promise.all([
      prisma.product.count({ where: { storeId: DEFAULT_STORE_ID, isDemo: true } }),
      prisma.order.count({ where: { storeId: DEFAULT_STORE_ID, isDemo: true } }),
      prisma.customer.count({ where: { storeId: DEFAULT_STORE_ID, isDemo: true } }),
      prisma.brand.count({ where: { storeId: DEFAULT_STORE_ID, isDemo: true } }),
    ]),
  ]);
  const [demoProducts, demoOrders, demoCustomers, demoBrands] = demo;
  const missing = [!filled(settings.legalName) && "business name", !filled(settings.email) && "email", !filled(settings.phone) && "phone", !filled(location?.line1) && "shop address"].filter(Boolean);

  return (
    <AdminPage title="Settings" intro="Each section saves on its own.">
      <nav aria-label="Settings sections" className="mb-8 flex flex-wrap gap-2 text-sm">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center rounded-sm border border-line px-3 hover:border-ink">
            {label}
          </a>
        ))}
      </nav>

      {typeof demoRemoved === "string" && (
        <div className="mb-8">
          <FormAlert tone="success">Demo data removed ({demoRemoved.slice(0, 120)}). Your own products, orders and settings were kept.</FormAlert>
        </div>
      )}

      {missing.length > 0 && (
        <div className="mb-8">
          <FormAlert tone="info">Still to fill in: {missing.join(", ")}. They appear on invoices, the contact page and order emails.</FormAlert>
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
        <section id="store" className="scroll-mt-6">
          <Card title="Store details">
            <AdminForm action={saveStoreDetails}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Shop name">
                  <TextInput name="storeName" defaultValue={settings.storeName} required maxLength={60} />
                </Field>
                <Field label="Registered business name" hint="As on your GST certificate or bank account. Printed on invoices.">
                  <TextInput name="legalName" defaultValue={filled(settings.legalName)} required maxLength={120} />
                </Field>
                <Field label="Email" hint="Shown to customers and used as the reply address.">
                  <TextInput name="email" type="email" defaultValue={filled(settings.email)} required />
                </Field>
                <Field label="Phone">
                  <TextInput name="phone" type="tel" defaultValue={filled(settings.phone)} required placeholder="98765 43210" />
                </Field>
                <Field label="WhatsApp" hint="Optional. Shows a WhatsApp button in the shop.">
                  <TextInput name="whatsapp" type="tel" defaultValue={settings.whatsapp ?? ""} placeholder="98765 43210" />
                </Field>
                <Field label="GSTIN" hint="Optional until you register. Printed on invoices.">
                  <TextInput name="gstin" defaultValue={settings.gstin ?? ""} maxLength={15} className="uppercase" />
                </Field>
                <Field label="GST registered in" hint="Orders to this state get CGST + SGST; others IGST.">
                  <Select name="gstStateCode" defaultValue={settings.gstStateCode}>
                    {STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </AdminForm>
          </Card>
        </section>

        <section id="address" className="scroll-mt-6">
          <Card title="Shop address">
            <AdminForm action={saveShopAddress}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Street address" className="sm:col-span-2">
                  <TextInput name="line1" defaultValue={filled(location?.line1)} required maxLength={120} autoComplete="address-line1" />
                </Field>
                <Field label="Area or building" hint="Optional.">
                  <TextInput name="line2" defaultValue={location?.line2 ?? ""} maxLength={120} />
                </Field>
                <Field label="Landmark" hint="Optional.">
                  <TextInput name="landmark" defaultValue={location?.landmark ?? ""} maxLength={80} />
                </Field>
                <Field label="Town or city">
                  <TextInput name="city" defaultValue={location?.city ?? ""} required />
                </Field>
                <Field label="PIN code">
                  <TextInput name="pinCode" defaultValue={filled(location?.pinCode)} required inputMode="numeric" maxLength={6} />
                </Field>
                <Field label="State">
                  <Select name="stateCode" defaultValue={location?.stateCode ?? settings.gstStateCode}>
                    {STATES.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Shop phone">
                  <TextInput name="phone" type="tel" defaultValue={filled(location?.phone)} required />
                </Field>
                <Field label="Google Maps link" hint="Optional. Shown on the contact page." className="sm:col-span-2">
                  <TextInput name="mapUrl" type="url" defaultValue={location?.mapUrl ?? ""} placeholder="https://maps.app.goo.gl/…" />
                </Field>
              </div>
            </AdminForm>
          </Card>
        </section>

        <section id="delivery" className="scroll-mt-6">
          <Card title="Delivery and cash on delivery">
            <AdminForm action={saveDelivery}>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Free delivery from (₹)" hint="Bag value after discounts. Empty = never free.">
                  <TextInput name="freeShippingThreshold" defaultValue={rupees(settings.freeShippingThreshold)} inputMode="decimal" />
                </Field>
                <Field label="Same-day dispatch cut-off" hint="Hour (0–23, IST). Later orders count from the next working day.">
                  <TextInput name="dispatchCutoffHour" type="number" min={0} max={23} defaultValue={settings.dispatchCutoffHour} />
                </Field>
                <Field label="Packing days" hint="Working days before dispatch.">
                  <TextInput name="processingDays" type="number" min={0} max={10} defaultValue={settings.processingDays} />
                </Field>
              </div>

              <h3 className="mt-8 mb-2 text-sm font-semibold">Delivery charges by area</h3>
              <div className="relative -mx-5 overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <caption className="sr-only">Delivery charges and days by area</caption>
                  <thead>
                    <tr>
                      <th className={th}>Area</th>
                      <th className={th}>Charge ₹</th>
                      <th className={th}>Days from</th>
                      <th className={th}>to</th>
                      <th className={th}>COD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.flatMap((zone) =>
                      zone.rates.map((rate) => (
                        <tr key={rate.id}>
                          <td className={td}>
                            <span className="font-medium">{zone.name}</span>
                            {zone.rates.length > 1 && <span className="block text-xs text-muted">{rate.name}</span>}
                          </td>
                          <td className={td}>
                            <input name={`rate-price-${rate.id}`} defaultValue={rupees(rate.price)} inputMode="decimal" aria-label={`Charge for ${zone.name}`} className="min-h-10 w-20 rounded-sm border border-line-strong bg-canvas px-2 tabular-nums" />
                          </td>
                          <td className={td}>
                            <input name={`rate-min-${rate.id}`} type="number" min={0} max={30} defaultValue={rate.minDays} aria-label={`Fewest days to ${zone.name}`} className="min-h-10 w-16 rounded-sm border border-line-strong bg-canvas px-2 tabular-nums" />
                          </td>
                          <td className={td}>
                            <input name={`rate-max-${rate.id}`} type="number" min={0} max={30} defaultValue={rate.maxDays} aria-label={`Most days to ${zone.name}`} className="min-h-10 w-16 rounded-sm border border-line-strong bg-canvas px-2 tabular-nums" />
                          </td>
                          <td className={td}>
                            <input type="checkbox" name={`rate-cod-${rate.id}`} defaultChecked={rate.codAvailable} aria-label={`Cash on delivery in ${zone.name}`} className="size-5 accent-[var(--link)]" />
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">Days count after dispatch; Sundays are skipped. The charge is waived above the free-delivery amount.</p>

              <h3 className="mt-8 mb-2 text-sm font-semibold">Cash on delivery</h3>
              <Checkbox name="codEnabled" label="Offer cash on delivery" defaultChecked={settings.codEnabled} />
              <div className="mt-3 grid gap-5 sm:grid-cols-3">
                <Field label="COD fee (₹)" hint="Added to COD orders. Empty or 0 = free.">
                  <TextInput name="codFee" defaultValue={rupees(settings.codFee)} inputMode="decimal" />
                </Field>
                <Field label="COD from (₹)" hint="Optional minimum order.">
                  <TextInput name="codMinOrder" defaultValue={rupees(settings.codMinOrder)} inputMode="decimal" />
                </Field>
                <Field label="COD up to (₹)" hint="Optional. Bigger orders must pay online.">
                  <TextInput name="codMaxOrder" defaultValue={rupees(settings.codMaxOrder)} inputMode="decimal" />
                </Field>
              </div>
            </AdminForm>
          </Card>
        </section>

        <section id="returns" className="scroll-mt-6">
          <Card title="Returns and stock">
            <AdminForm action={saveReturns}>
              <div className="grid gap-1">
                <Checkbox name="returnsEnabled" label="Accept returns" defaultChecked={settings.returnsEnabled} />
                <Checkbox name="exchangesEnabled" label="Offer size exchanges" defaultChecked={settings.exchangesEnabled} />
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                <Field label="Return window (days after delivery)">
                  <TextInput name="returnWindowDays" type="number" min={0} max={60} defaultValue={settings.returnWindowDays} />
                </Field>
                <Field label="Low stock at or below" hint="Units per size. Shows on the dashboard and as “Only a few left”.">
                  <TextInput name="lowStockThreshold" type="number" min={0} max={1000} defaultValue={settings.lowStockThreshold} />
                </Field>
              </div>
            </AdminForm>
          </Card>
        </section>

        <section id="announcement" className="scroll-mt-6">
          <Card title="Announcement bar">
            <AdminForm action={saveAnnouncement}>
              <div className="grid gap-5">
                <Checkbox name="announcementEnabled" label="Show the bar above the header" defaultChecked={settings.announcementEnabled} />
                <Field label="Message" hint="Up to 140 characters. Shoppers who closed the bar see it again when the message changes.">
                  <TextInput name="announcementText" defaultValue={settings.announcementText ?? ""} maxLength={140} />
                </Field>
                <Field label="Link" hint="Optional, e.g. /sale.">
                  <TextInput name="announcementHref" defaultValue={settings.announcementHref ?? ""} />
                </Field>
              </div>
            </AdminForm>
          </Card>
        </section>

        <section id="invoices" className="scroll-mt-6">
          <Card title="Invoices">
            <AdminForm action={saveInvoiceSettings}>
              <div className="grid gap-5 sm:grid-cols-[1fr_3fr]">
                <Field label="Number prefix" hint="MN gives MN/2026-27/000001.">
                  <TextInput name="invoicePrefix" defaultValue={settings.invoicePrefix} maxLength={8} className="uppercase" />
                </Field>
                <Field label="Footer note" hint="Optional, e.g. bank details or a thank-you line.">
                  <TextArea name="invoiceFooter" rows={2} defaultValue={settings.invoiceFooter ?? ""} maxLength={300} />
                </Field>
              </div>
            </AdminForm>
          </Card>
        </section>

        <section id="demo-data" className="scroll-mt-6">
          <Card title="Demo data">
            {demoProducts + demoOrders + demoCustomers + demoBrands === 0 ? (
              <p className="text-sm text-muted">No demo data left. Run <code className="font-mono">npm run seed</code> on a computer to load it again for testing.</p>
            ) : (
              <>
                <p className="text-sm">
                  The shop holds demo data for trying things out: {demoProducts} products, {demoBrands} brands (with real brand names such as Rolex and Chanel), {demoOrders}{" "}
                  orders and {demoCustomers} customers, plus their photos, reviews, coupons, banners and Journal posts.
                </p>
                <p className="mt-2 mb-4 text-sm text-muted">
                  Removing it keeps your categories, size charts, policy pages, delivery areas, settings and every real order and product.
                </p>
                <ConfirmButton
                  action={removeAllDemoData}
                  label="Remove all demo data"
                  confirmLabel="Remove demo data"
                  question="Remove every demo product, brand, order, customer and post? This cannot be undone."
                  typeToConfirm="REMOVE"
                />
              </>
            )}
          </Card>
        </section>
      </div>
    </AdminPage>
  );
}
