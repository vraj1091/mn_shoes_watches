import "server-only";
import { connection } from "next/server";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { mediaUrl } from "@/lib/media/url";
import { safeEqual } from "@/lib/security/crypto";

const orderInclude = {
  items: { include: { product: { select: { slug: true, media: { where: { role: "GALLERY" }, orderBy: { position: "asc" }, take: 1, include: { media: true } } } } } },
  addresses: true,
  events: { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
  shipments: { include: { events: { orderBy: { occurredAt: "asc" } } }, orderBy: { createdAt: "desc" } },
  payments: { orderBy: { createdAt: "desc" } },
} as const;

async function shape(order: NonNullable<Awaited<ReturnType<typeof findOrder>>>) {
  return {
    ...order,
    shippingAddress: order.addresses.find((address) => address.type === "SHIPPING") ?? null,
    items: order.items.map((item) => {
      const media = item.product?.media[0]?.media;
      return { ...item, slug: item.product?.slug ?? null, imageUrl: media?.key ? mediaUrl(media.key) : null, imageAlt: media?.alt ?? item.productTitle };
    }),
  };
}

function findOrder(where: { publicToken: string } | { storeId_number: { storeId: string; number: string } }) {
  return prisma.order.findUnique({ where, include: orderInclude });
}

export type OrderDetail = Awaited<ReturnType<typeof shape>>;

/** The order behind a confirmation link. The token is long and random, so the link is the key. */
export async function getOrderByToken(token: string): Promise<OrderDetail | null> {
  await connection();
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const order = await findOrder({ publicToken: token });
  return order ? shape(order) : null;
}

/** Order tracking needs the order number and the phone number it was placed with. */
export async function findOrderForTracking(number: string, phone: string): Promise<OrderDetail | null> {
  const order = await findOrder({ storeId_number: { storeId: DEFAULT_STORE_ID, number: number.trim().toUpperCase() } });
  if (!order || !safeEqual(order.phone, phone)) return null;
  return shape(order);
}
