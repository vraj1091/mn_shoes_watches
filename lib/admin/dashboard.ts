import "server-only";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { istDateKey } from "@/lib/format/date";

/** Orders that count as sales: placed, and not cancelled or returned undelivered. */
const SALE_STATUSES = ["AWAITING_COD_CONFIRMATION", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export type SalesDay = { key: string; label: string; total: number; orders: number };

const dayLabel = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });

export async function getDashboard(days = 30) {
  const now = new Date();
  const since = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const [orders, settings, recent, toShip, awaitingCod] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: DEFAULT_STORE_ID, placedAt: { gte: since }, status: { in: [...SALE_STATUSES] } },
      select: { placedAt: true, grandTotal: true },
    }),
    prisma.storeSettings.findUnique({ where: { storeId: DEFAULT_STORE_ID }, select: { lowStockThreshold: true } }),
    prisma.order.findMany({
      where: { storeId: DEFAULT_STORE_ID },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, number: true, status: true, paymentMethod: true, paymentStatus: true, grandTotal: true, createdAt: true, addresses: { where: { type: "SHIPPING" }, select: { name: true, city: true } } },
    }),
    prisma.order.count({ where: { storeId: DEFAULT_STORE_ID, status: { in: ["CONFIRMED", "PACKED"] } } }),
    prisma.order.count({ where: { storeId: DEFAULT_STORE_ID, status: "AWAITING_COD_CONFIRMATION" } }),
  ]);

  const threshold = settings?.lowStockThreshold ?? 5;
  const lowStock = await prisma.productVariant.findMany({
    where: { isActive: true, stockOnHand: { lte: threshold }, product: { storeId: DEFAULT_STORE_ID, status: "ACTIVE" } },
    orderBy: [{ stockOnHand: "asc" }, { product: { title: "asc" } }],
    take: 12,
    select: { id: true, sku: true, title: true, stockOnHand: true, product: { select: { id: true, title: true } } },
  });

  // One bar per IST calendar day, including days with no sales.
  const byDay = new Map<string, SalesDay>();
  for (let i = 0; i < days; i++) {
    const date = new Date(since.getTime() + i * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000);
    const key = istDateKey(date);
    byDay.set(key, { key, label: dayLabel.format(date), total: 0, orders: 0 });
  }
  for (const order of orders) {
    const day = byDay.get(istDateKey(order.placedAt!));
    if (!day) continue;
    day.total += order.grandTotal;
    day.orders += 1;
  }
  const series = [...byDay.values()];
  const sales = series.reduce((sum, day) => sum + day.total, 0);
  const count = series.reduce((sum, day) => sum + day.orders, 0);

  return {
    series,
    sales,
    orders: count,
    averageOrder: count ? Math.round(sales / count) : 0,
    lowStock,
    lowStockThreshold: threshold,
    recent,
    toShip,
    awaitingCod,
  };
}
