import "server-only";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { financialYear, invoiceLines } from "@/lib/commerce/invoice";

/**
 * Issues the tax invoice for an order once, with the next gapless number for the financial year
 * (MN/2026-27/000001; demo orders get DEMO/2026-27/…). Calling it again returns the invoice already issued.
 */
export async function issueInvoice(orderId: string) {
  const existing = await prisma.invoice.findFirst({ where: { orderId, type: "TAX_INVOICE" } });
  if (existing) return existing;
  const [order, settings] = await Promise.all([
    prisma.order.findFirstOrThrow({ where: { id: orderId, storeId: DEFAULT_STORE_ID }, include: { items: true } }),
    prisma.storeSettings.findUniqueOrThrow({ where: { storeId: DEFAULT_STORE_ID } }),
  ]);
  const issuedAt = new Date();
  const year = financialYear(issuedAt);
  const sameState = order.placeOfSupply === settings.gstStateCode;
  const lines = invoiceLines(order, sameState);
  const sum = (key: "taxable" | "cgst" | "sgst" | "igst") => lines.reduce((total, line) => total + line[key], 0);

  return prisma.$transaction(async (tx) => {
    // Demo orders count separately so removing them never leaves a gap in the real series.
    const key = order.isDemo ? `demo-invoice:${year}` : `invoice:${year}`;
    const counter = await tx.counter.upsert({
      where: { storeId_key: { storeId: DEFAULT_STORE_ID, key } },
      create: { storeId: DEFAULT_STORE_ID, key, nextValue: 2 },
      update: { nextValue: { increment: 1 } },
    });
    const number = `${order.isDemo ? "DEMO" : settings.invoicePrefix}/${year}/${String(counter.nextValue - 1).padStart(6, "0")}`;
    return tx.invoice.create({
      data: {
        storeId: DEFAULT_STORE_ID,
        orderId: order.id,
        type: "TAX_INVOICE",
        number,
        financialYear: year,
        issuedAt,
        sellerGstin: settings.gstin,
        buyerGstin: order.buyerGstin,
        placeOfSupply: order.placeOfSupply,
        taxableTotal: sum("taxable"),
        cgstTotal: sum("cgst"),
        sgstTotal: sum("sgst"),
        igstTotal: sum("igst"),
        grandTotal: order.grandTotal,
        lines,
      },
    });
  });
}
