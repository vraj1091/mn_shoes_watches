import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import type { OrderStatusName } from "./order-status";

export const ORDER_TABS: { key: string; label: string; statuses: OrderStatusName[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "open", label: "To process", statuses: ["AWAITING_COD_CONFIRMATION", "CONFIRMED", "PACKED"] },
  { key: "transit", label: "On the way", statuses: ["SHIPPED", "OUT_FOR_DELIVERY"] },
  { key: "delivered", label: "Delivered", statuses: ["DELIVERED"] },
  { key: "unpaid", label: "Waiting for payment", statuses: ["PENDING_PAYMENT"] },
  { key: "closed", label: "Cancelled or returned", statuses: ["CANCELLED", "RETURNED_TO_ORIGIN"] },
];

const PAGE_SIZE = 25;

export async function listOrders({ tab, q, page }: { tab: string; q: string; page: number }) {
  const statuses = ORDER_TABS.find((entry) => entry.key === tab)?.statuses ?? null;
  const search = q.trim();
  const digits = search.replace(/\D/g, "");
  const where: Prisma.OrderWhereInput = {
    storeId: DEFAULT_STORE_ID,
    ...(statuses ? { status: { in: statuses } } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search.toUpperCase() } },
            { email: { contains: search.toLowerCase() } },
            ...(digits.length >= 5 ? [{ phone: { contains: digits.slice(-10) } }] : []),
            { addresses: { some: { name: { contains: search } } } },
          ],
        }
      : {}),
  };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        grandTotal: true,
        createdAt: true,
        isDemo: true,
        _count: { select: { items: true } },
        addresses: { where: { type: "SHIPPING" }, select: { name: true, city: true, pinCode: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);
  return { orders, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getAdminOrder(id: string) {
  return prisma.order.findFirst({
    where: { id, storeId: DEFAULT_STORE_ID },
    include: {
      items: true,
      addresses: true,
      events: { orderBy: { createdAt: "desc" }, include: { staff: { select: { name: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      shipments: { include: { events: { orderBy: { occurredAt: "desc" } } } },
      customer: { select: { id: true, name: true, orderCount: true } },
    },
  });
}

export type AdminOrder = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
