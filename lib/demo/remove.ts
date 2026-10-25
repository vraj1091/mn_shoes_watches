import type { PrismaClient } from "@/lib/generated/prisma/client";

export type DemoRemovalResult = Record<"orders" | "products" | "brands" | "media" | "reviews" | "customers" | "coupons" | "posts" | "banners", number>;

/**
 * Deletes every record the demo seed created (isDemo), plus the earlier sample products tagged
 * "sample". Real orders keep their own copies of titles and prices, so they are unaffected.
 * Store structure (categories, attributes, size charts, policy pages, settings) is kept.
 * Shared by `npm run seed`, which resets demo data, and Settings → Remove all demo data.
 */
export async function removeDemoData(prisma: PrismaClient, storeId = "main"): Promise<DemoRemovalResult> {
  return prisma.$transaction(async (tx) => {
    const demoOrders = await tx.order.findMany({ where: { storeId, isDemo: true }, select: { id: true } });
    const orderIds = demoOrders.map((order) => order.id);
    // Invoices are legal records and block deletion of their order; demo orders never have real ones.
    await tx.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    const orders = await tx.order.deleteMany({ where: { id: { in: orderIds } } });

    const demoProducts = await tx.product.findMany({
      where: { storeId, OR: [{ isDemo: true }, { tags: { some: { tag: { slug: "sample" } } } }] },
      select: { id: true },
    });
    const productIds = demoProducts.map((product) => product.id);
    const reviews = await tx.review.deleteMany({ where: { storeId, OR: [{ isDemo: true }, { productId: { in: productIds } }] } });
    await tx.productRelation.deleteMany({ where: { OR: [{ productId: { in: productIds } }, { relatedId: { in: productIds } }] } });
    const products = await tx.product.deleteMany({ where: { id: { in: productIds } } });
    await tx.tag.deleteMany({ where: { storeId, slug: "sample", products: { none: {} } } });

    const banners = await tx.banner.deleteMany({ where: { storeId, isDemo: true } });
    const posts = await tx.post.deleteMany({ where: { storeId, isDemo: true } });
    await tx.author.deleteMany({ where: { storeId, isDemo: true, posts: { none: {} } } });
    const media = await tx.media.deleteMany({ where: { storeId, isDemo: true, productMedia: { none: {} } } });
    const brands = await tx.brand.deleteMany({ where: { storeId, isDemo: true } });
    const coupons = await tx.discount.deleteMany({ where: { storeId, isDemo: true } });
    const customers = await tx.customer.deleteMany({ where: { storeId, isDemo: true } });

    return {
      orders: orders.count,
      products: products.count,
      brands: brands.count,
      media: media.count,
      reviews: reviews.count,
      customers: customers.count,
      coupons: coupons.count,
      posts: posts.count,
      banners: banners.count,
    };
  });
}

/** True while any demo record is still in the database; the admin shows a banner until then. */
export async function hasDemoData(prisma: PrismaClient, storeId = "main"): Promise<boolean> {
  const [products, orders] = await Promise.all([
    prisma.product.count({ where: { storeId, isDemo: true } }),
    prisma.order.count({ where: { storeId, isDemo: true } }),
  ]);
  return products + orders > 0;
}
