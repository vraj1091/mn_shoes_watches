import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import type { InvoiceLine } from "@/lib/commerce/invoice";
import { stateName } from "@/lib/commerce/india";
import { formatDate } from "@/lib/format/date";
import { formatPriceExact } from "@/lib/format/money";
import { formatIndianMobile } from "@/lib/format/phone";
import { rupeesInWords } from "@/lib/format/words";
import { ArrowLeftIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { PrintButton } from "@/components/admin/print-button";

export const metadata: Metadata = { title: "Tax invoice" };

type Props = { params: Promise<{ id: string }> };

const cell = "border border-line px-2 py-1.5 align-top";
const num = `${cell} text-right tabular-nums`;

export default async function InvoicePage({ params }: Props) {
  await requireStaff("orders.view");
  const { id } = await params;
  const [invoice, settings, location] = await Promise.all([
    prisma.invoice.findFirst({
      where: { orderId: id, storeId: DEFAULT_STORE_ID, type: "TAX_INVOICE" },
      include: { order: { include: { addresses: true } } },
    }),
    prisma.storeSettings.findUniqueOrThrow({ where: { storeId: DEFAULT_STORE_ID } }),
    prisma.storeLocation.findFirst({ where: { storeId: DEFAULT_STORE_ID, isActive: true }, orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] }),
  ]);
  if (!invoice) notFound();

  const lines = invoice.lines as InvoiceLine[];
  const intraState = invoice.igstTotal === 0;
  const order = invoice.order;
  const billing = order.addresses.find((address) => address.type === "BILLING") ?? order.addresses.find((address) => address.type === "SHIPPING");
  const shipping = order.addresses.find((address) => address.type === "SHIPPING");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <ButtonLink href={`/admin/orders/${order.id}`} variant="ghost" size="sm">
          <ArrowLeftIcon size={16} />
          Order {order.number}
        </ButtonLink>
        <PrintButton />
      </div>

      <article className="rounded-md border border-line bg-raised p-6 text-sm sm:p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="text-xl font-semibold">{settings.legalName ?? settings.storeName}</p>
            {location && (
              <p className="mt-1 leading-relaxed text-muted">
                {location.line1}
                {location.line2 ? `, ${location.line2}` : ""}
                <br />
                {location.city} {location.pinCode}, {location.state}
              </p>
            )}
            <p className="mt-1 text-muted">
              {settings.phone ? formatIndianMobile(settings.phone) : ""} · {settings.email}
            </p>
            <p className="mt-1">
              GSTIN: <span className="font-medium">{invoice.sellerGstin ?? "Not registered yet"}</span>
            </p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-semibold tracking-tight">Tax invoice</h1>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-3 gap-y-0.5">
              <dt className="text-muted">Invoice no.</dt>
              <dd className="font-medium">{invoice.number}</dd>
              <dt className="text-muted">Date</dt>
              <dd>{formatDate(invoice.issuedAt)}</dd>
              <dt className="text-muted">Order</dt>
              <dd>{order.number}</dd>
              <dt className="text-muted">Place of supply</dt>
              <dd>
                {stateName(invoice.placeOfSupply) ?? "—"} ({invoice.placeOfSupply})
              </dd>
            </dl>
          </div>
        </header>

        <div className="grid gap-6 border-b border-line py-6 sm:grid-cols-2">
          {billing && <AddressBlock label="Bill to" address={billing} gstin={invoice.buyerGstin} />}
          {shipping && <AddressBlock label="Ship to" address={shipping} />}
        </div>

        <div className="overflow-x-auto py-6">
          <table className="w-full min-w-[40rem] border-collapse text-xs">
            <thead>
              <tr className="bg-surface text-left">
                <th className={cell}>#</th>
                <th className={cell}>Description</th>
                <th className={cell}>HSN/SAC</th>
                <th className={`${cell} text-right`}>Qty</th>
                <th className={`${cell} text-right`}>Taxable value</th>
                <th className={`${cell} text-right`}>GST rate</th>
                {intraState ? (
                  <>
                    <th className={`${cell} text-right`}>CGST</th>
                    <th className={`${cell} text-right`}>SGST</th>
                  </>
                ) : (
                  <th className={`${cell} text-right`}>IGST</th>
                )}
                <th className={`${cell} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.sku}-${index}`}>
                  <td className={cell}>{index + 1}</td>
                  <td className={cell}>
                    {line.description}
                    {line.sku && <span className="block text-muted">SKU {line.sku}</span>}
                  </td>
                  <td className={cell}>{line.hsn}</td>
                  <td className={num}>{line.quantity}</td>
                  <td className={num}>{formatPriceExact(line.taxable)}</td>
                  <td className={num}>{line.rateBp / 100}%</td>
                  {intraState ? (
                    <>
                      <td className={num}>{formatPriceExact(line.cgst)}</td>
                      <td className={num}>{formatPriceExact(line.sgst)}</td>
                    </>
                  ) : (
                    <td className={num}>{formatPriceExact(line.igst)}</td>
                  )}
                  <td className={num}>{formatPriceExact(line.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td className={cell} colSpan={4}>
                  Total
                </td>
                <td className={num}>{formatPriceExact(invoice.taxableTotal)}</td>
                <td className={cell} />
                {intraState ? (
                  <>
                    <td className={num}>{formatPriceExact(invoice.cgstTotal)}</td>
                    <td className={num}>{formatPriceExact(invoice.sgstTotal)}</td>
                  </>
                ) : (
                  <td className={num}>{formatPriceExact(invoice.igstTotal)}</td>
                )}
                <td className={num}>{formatPriceExact(invoice.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-md">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Amount in words</p>
            <p className="mt-1">{rupeesInWords(invoice.grandTotal)}</p>
            {order.discountTotal > 0 && (
              <p className="mt-3 text-muted">
                Includes a discount of {formatPriceExact(order.discountTotal)}
                {order.couponCode ? ` (${order.couponCode})` : ""}, already taken off the line totals.
              </p>
            )}
            <p className="mt-3 text-muted">
              Payment: {order.paymentMethod === "COD" ? "Cash on delivery" : "Paid online"}. Prices include GST. Tax is not payable on reverse charge.
            </p>
          </div>
          <dl className="grid min-w-56 grid-cols-[1fr_auto] gap-x-6 gap-y-1">
            <dt className="text-muted">Taxable value</dt>
            <dd className="price text-right">{formatPriceExact(invoice.taxableTotal)}</dd>
            <dt className="text-muted">GST</dt>
            <dd className="price text-right">{formatPriceExact(invoice.cgstTotal + invoice.sgstTotal + invoice.igstTotal)}</dd>
            <dt className="border-t border-line pt-1 text-base font-semibold">Invoice total</dt>
            <dd className="price border-t border-line pt-1 text-right text-base font-semibold">{formatPriceExact(invoice.grandTotal)}</dd>
          </dl>
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
          {settings.invoiceFooter && <p className="mb-2">{settings.invoiceFooter}</p>}
          <p>This is a computer-generated invoice and needs no signature.</p>
        </footer>
      </article>
    </div>
  );
}

function AddressBlock({ label, address, gstin }: { label: string; address: { name: string; line1: string; line2: string | null; city: string; pinCode: string; state: string; phone: string }; gstin?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 leading-relaxed">
        <span className="font-medium">{address.name}</span>
        <br />
        {address.line1}
        {address.line2 ? `, ${address.line2}` : ""}
        <br />
        {address.city} {address.pinCode}, {address.state}
        <br />
        {formatIndianMobile(address.phone)}
      </p>
      {gstin && <p className="mt-1">GSTIN: {gstin}</p>}
    </div>
  );
}
