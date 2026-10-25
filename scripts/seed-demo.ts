/*
 * npm run seed
 *
 * Makes the shop usable end to end with demo data (DECISIONS.md 47):
 *  1. store structure, if missing (prisma/seed/base.ts);
 *  2. products from DummyJSON (https://dummyjson.com, a free public demo-data API), with every
 *     photo downloaded into public/demo/<category>/<product>/ so the site never loads their CDN;
 *  3. placeholder-photo products for categories DummyJSON has no photos for;
 *  4. brands, reviews, hero banners, customers, orders in every status, coupons and Journal posts.
 *
 * Every record it creates has isDemo = true. Running it again first removes the previous demo
 * records (and the old "sample" products), never touching anything else. If DummyJSON cannot be
 * reached, the copy saved in prisma/demo/dummyjson.json is used.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Prisma } from "../lib/generated/prisma/client";
import { cacheFile, databaseUrl } from "../lib/db/paths";
import { buildSearchText, listingFields } from "../lib/catalog/listing";
import { rateForUnitPrice, type TaxSlab } from "../lib/commerce/gst";
import { computeTotals, type CouponRule } from "../lib/commerce/totals";
import { removeDemoData } from "../lib/demo/remove";
import { ALL_TAGS } from "../lib/cache/tags";
import { hex } from "../lib/design/tokens";
import { seedBase, richText, STORE } from "../prisma/seed/base";
import { ATTRIBUTES, TEMPLATES } from "../prisma/seed/catalog";
import { BRANDS, DEMO_PAIRINGS, DEMO_PRODUCTS, type DemoProduct, type DummyCategory } from "../prisma/demo/products";
import { DEMO_AUTHOR, DEMO_BANNERS, DEMO_COUPONS, DEMO_CUSTOMERS, DEMO_ORDERS, DEMO_POSTS, type DemoOrder } from "../prisma/demo/content";
import { compareAtFromDiscount, inrFromUsd } from "../prisma/demo/pricing";
import { placeholderSvg } from "../prisma/demo/placeholder-svg";

if (existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (days: number, hour = 11) => {
  const date = new Date(now - days * DAY);
  date.setHours(hour, (days * 17) % 60, 0, 0);
  return date;
};

// ─── DummyJSON ───────────────────────────────────────────────────────────────

const DUMMY_CATEGORIES: DummyCategory[] = ["mens-shoes", "mens-watches", "womens-watches", "fragrances", "sunglasses"];
const DUMMY_CACHE = "prisma/demo/dummyjson.json";

type DummyReview = { rating: number; comment: string; date: string; reviewerName: string };
type DummyItem = { id: number; title: string; price: number; discountPercentage: number; images: string[]; thumbnail: string; reviews: DummyReview[] };
type DummyData = Record<DummyCategory, DummyItem[]>;

async function loadDummyJson(): Promise<DummyData> {
  try {
    const data = {} as DummyData;
    for (const category of DUMMY_CATEGORIES) {
      const response = await fetch(`https://dummyjson.com/products/category/${category}?limit=0`, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`DummyJSON answered ${response.status} for ${category}`);
      const body = (await response.json()) as { products: (DummyItem & Record<string, unknown>)[] };
      data[category] = body.products.map(({ id, title, price, discountPercentage, images, thumbnail, reviews }) => ({
        id,
        title,
        price,
        discountPercentage,
        images,
        thumbnail,
        reviews: reviews.map(({ rating, comment, date, reviewerName }) => ({ rating, comment, date, reviewerName })),
      }));
    }
    writeFileSync(DUMMY_CACHE, JSON.stringify(data, null, 2) + "\n");
    console.info("Fetched the demo catalogue from DummyJSON.");
    return data;
  } catch (error) {
    if (!existsSync(DUMMY_CACHE)) throw error;
    console.warn(`DummyJSON could not be reached (${(error as Error).message}); using the saved copy in ${DUMMY_CACHE}.`);
    return JSON.parse(readFileSync(DUMMY_CACHE, "utf8")) as DummyData;
  }
}

/** Some DummyJSON paths contain "&" and "'", so every path segment is encoded. */
function encodeUrl(url: string): string {
  const parsed = new URL(url);
  parsed.pathname = parsed.pathname
    .split("/")
    .map((part) => encodeURIComponent(decodeURIComponent(part)))
    .join("/");
  return parsed.toString();
}

async function download(url: string, file: string): Promise<boolean> {
  if (existsSync(file)) return false;
  const response = await fetch(encodeUrl(url), { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  return true;
}

/** A tiny blurred preview on the photo-tile colour, shown while the full photo loads. */
async function blurDataUrl(file: string): Promise<string> {
  const buffer = await sharp(file).resize(16, 16, { fit: "contain", background: hex("graphite-75") }).flatten({ background: hex("graphite-75") }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

// ─── Lookups ───────────────────────────────────────────────────────────────────

async function lookups() {
  const [attributes, categories, taxClasses] = await Promise.all([
    prisma.attribute.findMany({ where: { storeId: STORE }, include: { values: true } }),
    prisma.category.findMany({ where: { storeId: STORE }, select: { id: true, path: true, name: true, parentId: true, taxClassId: true } }),
    prisma.taxClass.findMany({ where: { storeId: STORE }, include: { slabs: true } }),
  ]);
  const attributeIds = new Map(attributes.map((attribute) => [attribute.code, attribute.id]));
  const valueIds = new Map(attributes.flatMap((attribute) => attribute.values.map((value) => [`${attribute.code}:${value.value}`, value.id] as const)));
  const categoryByPath = new Map(categories.map((category) => [category.path, category]));
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const classById = new Map(
    taxClasses.map((taxClass) => [taxClass.id, { hsnCode: taxClass.hsnCode, slabs: taxClass.slabs.map((slab) => ({ maxUnitValue: slab.maxUnitValue, rateBp: slab.rateBp })) }]),
  );
  /** Tax class of the nearest category up the tree that has one. */
  const taxFor = (categoryId: string | null): { hsnCode: string; slabs: TaxSlab[] } => {
    let current = categoryId ? categoryById.get(categoryId) : undefined;
    while (current) {
      if (current.taxClassId) return classById.get(current.taxClassId) ?? { hsnCode: "", slabs: [] };
      current = current.parentId ? categoryById.get(current.parentId) : undefined;
    }
    return { hsnCode: "", slabs: [] };
  };
  return { attributeIds, valueIds, categoryByPath, taxFor };
}

// ─── Products ──────────────────────────────────────────────────────────────────

type CreatedProduct = { id: string; slug: string; title: string; brandName: string; primaryCategoryId: string; variants: { id: string; sku: string; title: string; price: number; compareAtPrice: number | null }[]; imageKey: string; mediaId: string };

async function createProduct(
  seed: DemoProduct,
  dummy: DummyItem | null,
  brandIds: Map<string, string>,
  refs: Awaited<ReturnType<typeof lookups>>,
): Promise<CreatedProduct> {
  const template = TEMPLATES.find((item) => item.code === seed.template)!;
  const price = dummy ? inrFromUsd(dummy.price) : (seed as Extract<DemoProduct, { source: "placeholder" }>).price;
  const compareAtPrice = dummy ? compareAtFromDiscount(dummy.price, dummy.discountPercentage) : ((seed as Extract<DemoProduct, { source: "placeholder" }>).compareAtPrice ?? null);

  // Photos
  const media: { key: string; width: number; height: number; alt: string; blur: string | null; mime: string }[] = [];
  if (seed.source === "dummyjson" && dummy) {
    const folder = `demo/${seed.dummy.category}/${seed.slug}`;
    await download(dummy.thumbnail, path.join("public", folder, "thumbnail.webp"));
    for (const [index, url] of dummy.images.entries()) {
      const name = `${index + 1}.webp`;
      const file = path.join("public", folder, name);
      await download(url, file);
      const meta = await sharp(file).metadata();
      media.push({
        key: `${folder}/${name}`,
        width: meta.width ?? 1000,
        height: meta.height ?? 1000,
        alt: index === 0 ? seed.title : `${seed.title}, another view`,
        blur: await blurDataUrl(file),
        mime: "image/webp",
      });
    }
  } else if (seed.source === "placeholder") {
    const key = `demo/placeholders/${seed.slug}.svg`;
    mkdirSync(path.join("public", "demo", "placeholders"), { recursive: true });
    writeFileSync(path.join("public", key), placeholderSvg(seed.icon, seed.title));
    media.push({ key, width: 1000, height: 1000, alt: `${seed.title} (placeholder image)`, blur: null, mime: "image/svg+xml" });
  }

  // Variants: every combination of the axes; a single default variant when there are none.
  const combinations = seed.axes.reduce<string[][]>((acc, [, values]) => acc.flatMap((combo) => values.map((value) => [...combo, value])), [[]]);
  if (combinations.length !== seed.stock.length) throw new Error(`${seed.slug}: ${combinations.length} variants but ${seed.stock.length} stock numbers`);
  const variants = combinations.map((values, index) => {
    // "UK 9" → 9, "Black" → BLA, "Red, white and black" → RWAB.
    const suffix = values.map((value) => {
      const words = value.replace(/^UK /, "").replace(/ (ml|in|mm)$/, "").split(/[\s,]+/).filter(Boolean);
      const code = words.length === 1 ? (/^\d/.test(words[0]!) ? words[0]! : words[0]!.slice(0, 3)) : words.map((word) => word[0]).join("");
      return code.toUpperCase();
    });
    return { values, sku: [seed.skuPrefix, ...suffix].join("-"), title: values.join(" / ") || "Default", price, compareAtPrice, stockOnHand: seed.stock[index]!, position: index };
  });
  const listing = listingFields(variants.map((variant) => ({ ...variant, isActive: true })));

  const categoryIds = seed.categories.map((categoryPath) => {
    const category = refs.categoryByPath.get(categoryPath);
    if (!category) throw new Error(`${seed.slug}: no category ${categoryPath}`);
    return category.id;
  });
  const ancestorNames = [...new Set(seed.categories.flatMap((categoryPath) => categoryPath.split("/").map((_, i, parts) => refs.categoryByPath.get(parts.slice(0, i + 1).join("/"))?.name ?? "")))];

  const reviews = dummy?.reviews ?? [];
  const ratingCount = reviews.length;
  const ratingAvg = ratingCount ? Math.round((reviews.reduce((acc, review) => acc + review.rating, 0) / ratingCount) * 10) / 10 : 0;
  const description = richText(seed.description);
  const publishedAt = daysAgo(seed.publishedDaysAgo, 9);

  const product = await prisma.product.create({
    data: {
      storeId: STORE,
      title: seed.title,
      slug: seed.slug,
      status: "ACTIVE",
      publishedAt,
      isDemo: true,
      isPlaceholderPhoto: seed.source === "placeholder",
      brandId: brandIds.get(seed.brand),
      primaryCategoryId: categoryIds[0],
      gender: seed.gender,
      summary: seed.summary,
      description: description.json,
      descriptionHtml: description.html,
      highlights: seed.highlights,
      specs: seed.specs,
      care: seed.care,
      warranty: seed.warranty,
      warrantyMonths: seed.warrantyMonths,
      faqs: seed.faqs,
      badges: seed.badges,
      bestsellerScore: seed.bestsellerScore,
      ratingAvg,
      ratingCount,
      ...listing,
      searchText: buildSearchText([seed.title, seed.brand, ...ancestorNames, ...Object.values(seed.attributes).flat().map(String), ...combinations.flat()]),
      createdAt: publishedAt,
      categories: { create: categoryIds.map((categoryId, position) => ({ categoryId, position })) },
    },
  });

  // Product-level attribute values (single-variant products keep their colour or volume here).
  const rows: Prisma.ProductAttributeValueCreateManyInput[] = [];
  for (const [code, raw] of Object.entries(seed.attributes)) {
    const attributeId = refs.attributeIds.get(code);
    if (!attributeId || !template.attributes.includes(code)) throw new Error(`${seed.slug}: attribute ${code} is not in the ${seed.template} template`);
    const definition = ATTRIBUTES.find((attribute) => attribute.code === code)!;
    if (definition.type === "NUMBER") {
      rows.push({ storeId: STORE, productId: product.id, attributeId, numberValue: Number(raw) });
      continue;
    }
    for (const value of Array.isArray(raw) ? raw : [String(raw)]) {
      const valueId = refs.valueIds.get(`${code}:${value}`);
      if (!valueId) throw new Error(`${seed.slug}: "${value}" is not a value of ${code}`);
      rows.push({ storeId: STORE, productId: product.id, attributeId, valueId });
    }
  }
  if (rows.length) await prisma.productAttributeValue.createMany({ data: rows });

  const options: string[] = [];
  for (const [position, [code]] of seed.axes.entries()) {
    options.push((await prisma.productOption.create({ data: { storeId: STORE, productId: product.id, attributeId: refs.attributeIds.get(code)!, position } })).id);
  }
  const createdVariants: CreatedProduct["variants"] = [];
  for (const variant of variants) {
    const created = await prisma.productVariant.create({
      data: {
        storeId: STORE,
        productId: product.id,
        sku: variant.sku,
        title: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        stockOnHand: variant.stockOnHand,
        position: variant.position,
        weightGrams: seed.weightGrams,
        lengthCm: seed.dimensionsCm[0],
        breadthCm: seed.dimensionsCm[1],
        heightCm: seed.dimensionsCm[2],
        options: {
          create: variant.values.map((value, index) => {
            const [code] = seed.axes[index]!;
            const valueId = refs.valueIds.get(`${code}:${value}`);
            if (!valueId) throw new Error(`${seed.slug}: "${value}" is not a value of ${code}`);
            return { optionId: options[index]!, valueId };
          }),
        },
        movements: { create: { storeId: STORE, delta: variant.stockOnHand, balanceAfter: variant.stockOnHand, reason: "STOCK_RECEIVED", note: "Opening stock (demo data)" } },
      },
    });
    createdVariants.push({ id: created.id, sku: created.sku, title: created.title, price: created.price, compareAtPrice: created.compareAtPrice });
  }

  let firstMediaId = "";
  for (const [position, image] of media.entries()) {
    const created = await prisma.media.create({
      data: {
        storeId: STORE,
        kind: "IMAGE",
        source: "UPLOAD",
        storage: "LOCAL",
        key: image.key,
        mimeType: image.mime,
        width: image.width,
        height: image.height,
        alt: image.alt,
        blurDataUrl: image.blur,
        originalName: path.basename(image.key),
        isDemo: true,
        productMedia: { create: { storeId: STORE, productId: product.id, role: "GALLERY", position } },
      },
    });
    if (position === 0) firstMediaId = created.id;
  }

  // DummyJSON's own reviews become demo reviews.
  for (const [index, review] of reviews.entries()) {
    const at = daysAgo(Math.max(0, seed.publishedDaysAgo - 3 - index * 2), 18);
    await prisma.review.create({
      data: {
        storeId: STORE,
        productId: product.id,
        authorName: review.reviewerName,
        rating: Math.min(5, Math.max(1, Math.round(review.rating))),
        body: review.comment,
        status: "APPROVED",
        isDemo: true,
        isFeatured: review.rating >= 5 && index === 0,
        publishedAt: at,
        createdAt: at,
      },
    });
  }

  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    brandName: seed.brand,
    primaryCategoryId: categoryIds[0]!,
    variants: createdVariants,
    imageKey: media[0]?.key ?? "",
    mediaId: firstMediaId,
  };
}

// ─── Orders ────────────────────────────────────────────────────────────────────

const STATUS_STEPS: Record<DemoOrder["status"], string[]> = {
  PENDING_PAYMENT: ["created"],
  AWAITING_COD_CONFIRMATION: ["placed"],
  CONFIRMED: ["placed", "confirmed"],
  PACKED: ["placed", "confirmed", "packed"],
  SHIPPED: ["placed", "confirmed", "packed", "shipped"],
  OUT_FOR_DELIVERY: ["placed", "confirmed", "packed", "shipped", "out_for_delivery"],
  DELIVERED: ["placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"],
  CANCELLED: ["placed", "cancelled"],
  RETURNED_TO_ORIGIN: ["placed", "confirmed", "packed", "shipped", "returned_to_origin"],
};

const STEP_MESSAGES: Record<string, string> = {
  created: "Order created; waiting for online payment.",
  placed: "Order placed.",
  confirmed: "Order confirmed.",
  packed: "Packed and ready for pickup.",
  shipped: "Handed to the courier.",
  out_for_delivery: "Out for delivery.",
  delivered: "Delivered.",
  cancelled: "Order cancelled.",
  returned_to_origin: "Returned to the shop: the courier could not deliver it.",
};

async function createOrders(products: Map<string, CreatedProduct>, customerIds: string[], taxFor: (categoryId: string | null) => { hsnCode: string; slabs: TaxSlab[] }) {
  const settings = await prisma.storeSettings.findUniqueOrThrow({ where: { storeId: STORE } });
  const coupons = new Map<string, CouponRule>(
    DEMO_COUPONS.map((coupon) => [coupon.code, { code: coupon.code, type: coupon.type, value: coupon.value, minOrderValue: coupon.minOrderValue, maxDiscount: null }]),
  );

  for (const [orderIndex, demo] of DEMO_ORDERS.entries()) {
    const customer = DEMO_CUSTOMERS[demo.customer]!;
    const created = daysAgo(demo.daysAgo, 10 + (orderIndex % 8));
    const lines = demo.items.map(([slug, variantIndex], index) => {
      const product = products.get(slug);
      if (!product) throw new Error(`Demo order ${demo.number}: no product ${slug}`);
      const variant = product.variants[variantIndex];
      if (!variant) throw new Error(`Demo order ${demo.number}: ${slug} has no variant ${variantIndex}`);
      const tax = taxFor(product.primaryCategoryId);
      return { key: String(index), product, variant, unitPrice: variant.price, quantity: 1, hsnCode: tax.hsnCode, rateBp: rateForUnitPrice(variant.price, tax.slabs) };
    });
    const totals = computeTotals({
      lines,
      coupon: demo.coupon ? coupons.get(demo.coupon)! : null,
      freeShippingThreshold: settings.freeShippingThreshold,
      shippingRate: 99_00,
      paymentMethod: demo.payment,
      codFee: settings.codFee,
    });
    const steps = STATUS_STEPS[demo.status];
    const placed = demo.status !== "PENDING_PAYMENT";
    const paid = demo.payment === "PREPAID" && placed;
    const delivered = demo.status === "DELIVERED";
    const paymentStatus =
      demo.status === "PENDING_PAYMENT" ? "UNPAID"
      : demo.status === "CANCELLED" && paid ? "REFUNDED"
      : demo.payment === "PREPAID" ? "PAID"
      : delivered ? "COD_COLLECTED"
      : demo.status === "RETURNED_TO_ORIGIN" || demo.status === "CANCELLED" ? "UNPAID"
      : "COD_PENDING";

    const order = await prisma.order.create({
      data: {
        storeId: STORE,
        number: demo.number,
        publicToken: randomBytes(16).toString("hex"),
        customerId: customerIds[demo.customer],
        email: customer.email,
        phone: customer.phone,
        status: demo.status,
        paymentStatus,
        paymentMethod: demo.payment,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shippingTotal: totals.shippingTotal,
        codFee: totals.codFee,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
        amountRefunded: paymentStatus === "REFUNDED" ? totals.grandTotal : 0,
        couponCode: demo.coupon ?? null,
        shippingMethod: "Standard delivery",
        deliveryMinDate: new Date(created.getTime() + 2 * DAY),
        deliveryMaxDate: new Date(created.getTime() + 5 * DAY),
        placeOfSupply: customer.address.stateCode,
        customerNote: demo.note,
        placedAt: placed ? created : null,
        confirmedAt: steps.includes("confirmed") ? new Date(created.getTime() + 2 * 60 * 60 * 1000) : null,
        cancelledAt: demo.status === "CANCELLED" ? new Date(created.getTime() + 3 * 60 * 60 * 1000) : null,
        cancelReason: demo.status === "CANCELLED" ? demo.note : null,
        deliveredAt: delivered ? new Date(created.getTime() + 3 * DAY) : null,
        isDemo: true,
        createdAt: created,
        items: {
          create: lines.map((line, index) => ({
            storeId: STORE,
            productId: line.product.id,
            variantId: line.variant.id,
            productTitle: line.product.title,
            variantTitle: line.variant.title === "Default" ? null : line.variant.title,
            brandName: line.product.brandName,
            sku: line.variant.sku,
            imageKey: line.product.imageKey,
            hsnCode: line.hsnCode,
            gstRateBp: line.rateBp,
            unitPrice: line.unitPrice,
            compareAtPrice: line.variant.compareAtPrice,
            quantity: line.quantity,
            discountAmount: totals.lines[index]!.discount,
            lineTotal: totals.lines[index]!.lineTotal,
            taxableValue: totals.lines[index]!.taxable,
            taxAmount: totals.lines[index]!.tax,
          })),
        },
        addresses: {
          create: (["SHIPPING", "BILLING"] as const).map((type) => ({ storeId: STORE, type, ...customer.address, line2: customer.address.line2 ?? null })),
        },
        events: {
          create: steps.map((step, index) => ({
            storeId: STORE,
            type: "status_changed",
            message: STEP_MESSAGES[step]!,
            actor: step === "created" || step === "placed" ? ("CUSTOMER" as const) : ("STAFF" as const),
            createdAt: new Date(created.getTime() + index * 6 * 60 * 60 * 1000),
          })),
        },
        payments: {
          create: {
            storeId: STORE,
            provider: demo.payment === "COD" ? "COD" : "MANUAL",
            method: demo.payment === "COD" ? "cod" : "upi",
            amount: totals.grandTotal,
            status: paymentStatus === "PAID" ? "CAPTURED" : paymentStatus === "REFUNDED" ? "REFUNDED" : paymentStatus === "COD_COLLECTED" ? "CAPTURED" : "CREATED",
            capturedAt: paid || delivered ? created : null,
          },
        },
      },
      include: { items: true },
    });


    if (steps.includes("shipped")) {
      const shipmentStatus = demo.status === "DELIVERED" ? "DELIVERED" : demo.status === "OUT_FOR_DELIVERY" ? "OUT_FOR_DELIVERY" : demo.status === "RETURNED_TO_ORIGIN" ? "RTO_DELIVERED" : "IN_TRANSIT";
      const pickedUp = new Date(created.getTime() + DAY);
      await prisma.shipment.create({
        data: {
          storeId: STORE,
          orderId: order.id,
          provider: "MANUAL",
          awb: `DEMO${demo.number.slice(3)}${orderIndex}`,
          courierName: "Demo Courier",
          status: shipmentStatus,
          pickedUpAt: pickedUp,
          deliveredAt: demo.status === "DELIVERED" ? new Date(created.getTime() + 3 * DAY) : null,
          expectedDeliveryAt: new Date(created.getTime() + 4 * DAY),
          items: { create: order.items.map((item) => ({ orderItemId: item.id, quantity: item.quantity })) },
          events: {
            create: [
              { storeId: STORE, status: "PICKED_UP" as const, rawStatus: "Picked up", location: "Kalol, Gujarat", occurredAt: pickedUp },
              { storeId: STORE, status: "IN_TRANSIT" as const, rawStatus: "In transit", location: "Ahmedabad hub", occurredAt: new Date(pickedUp.getTime() + 10 * 60 * 60 * 1000) },
              ...(shipmentStatus === "OUT_FOR_DELIVERY" || shipmentStatus === "DELIVERED"
                ? [{ storeId: STORE, status: "OUT_FOR_DELIVERY" as const, rawStatus: "Out for delivery", location: customer.address.city, occurredAt: new Date(pickedUp.getTime() + DAY + 2 * 60 * 60 * 1000) }]
                : []),
              ...(shipmentStatus === "DELIVERED"
                ? [{ storeId: STORE, status: "DELIVERED" as const, rawStatus: "Delivered", location: customer.address.city, occurredAt: new Date(created.getTime() + 3 * DAY) }]
                : []),
              ...(shipmentStatus === "RTO_DELIVERED"
                ? [{ storeId: STORE, status: "RTO_DELIVERED" as const, rawStatus: "Returned to shipper after 3 failed attempts", location: "Kalol, Gujarat", occurredAt: new Date(created.getTime() + 6 * DAY) }]
                : []),
            ],
          },
        },
      });
    }
  }

  // Customer totals from their orders (placed and not cancelled).
  for (const customerId of customerIds) {
    const orders = await prisma.order.findMany({ where: { customerId, placedAt: { not: null }, status: { notIn: ["CANCELLED", "RETURNED_TO_ORIGIN"] } }, orderBy: { placedAt: "asc" } });
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        orderCount: orders.length,
        totalSpent: orders.reduce((acc, order) => acc + order.grandTotal, 0),
        firstOrderAt: orders[0]?.placedAt ?? null,
        lastOrderAt: orders.at(-1)?.placedAt ?? null,
      },
    });
  }
  for (const coupon of DEMO_COUPONS) {
    await prisma.discount.update({
      where: { storeId_code: { storeId: STORE, code: coupon.code } },
      data: { usageCount: DEMO_ORDERS.filter((order) => order.coupon === coupon.code && order.status !== "PENDING_PAYMENT").length },
    });
  }
}

/** A running production server shares cache.db; marking every tag expired shows the new data at once. */
function expireSharedCache() {
  const file = cacheFile();
  if (!existsSync(file)) return false;
  const db = new Database(file);
  try {
    db.pragma("busy_timeout = 5000");
    db.exec("CREATE TABLE IF NOT EXISTS tags (tag TEXT PRIMARY KEY, stale INTEGER, expired INTEGER)");
    const upsert = db.prepare("INSERT INTO tags (tag, stale, expired) VALUES (?, NULL, ?) ON CONFLICT(tag) DO UPDATE SET expired = excluded.expired");
    const at = Date.now();
    db.transaction(() => ALL_TAGS.forEach((tag) => upsert.run(tag, at)))();
  } finally {
    db.close();
  }
  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await seedBase(prisma);

  const removed = await removeDemoData(prisma, STORE);
  if (Object.values(removed).some(Boolean)) {
    console.info(`Removed previous demo data: ${Object.entries(removed).map(([key, count]) => `${count} ${key}`).join(", ")}.`);
  }

  const dummy = await loadDummyJson();
  const refs = await lookups();

  const brandIds = new Map<string, string>();
  for (const [position, brand] of BRANDS.entries()) {
    const existing = await prisma.brand.findUnique({ where: { storeId_slug: { storeId: STORE, slug: brand.slug } } });
    const record =
      existing ??
      (await prisma.brand.create({
        data: { storeId: STORE, name: brand.name, slug: brand.slug, intro: brand.intro, countryOfOrigin: brand.country, isFeatured: brand.featured ?? false, position, isDemo: true },
      }));
    brandIds.set(brand.name, record.id);
  }

  const products = new Map<string, CreatedProduct>();
  for (const seed of DEMO_PRODUCTS) {
    const item = seed.source === "dummyjson" ? dummy[seed.dummy.category].find((entry) => entry.title === seed.dummy.title) : null;
    if (seed.source === "dummyjson" && !item) throw new Error(`DummyJSON has no "${seed.dummy.title}" in ${seed.dummy.category}`);
    products.set(seed.slug, await createProduct(seed, item ?? null, brandIds, refs));
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  const relations = Object.entries(DEMO_PAIRINGS).flatMap(([from, related]) =>
    related.map((slug, position) => ({ productId: products.get(from)!.id, relatedId: products.get(slug)!.id, type: "COMPLETE_THE_LOOK" as const, position })),
  );
  await prisma.productRelation.createMany({ data: relations });

  for (const [position, banner] of DEMO_BANNERS.entries()) {
    await prisma.banner.create({
      data: {
        storeId: STORE,
        placement: "HOME_HERO",
        title: banner.title,
        subtitle: banner.subtitle,
        ctaLabel: banner.ctaLabel,
        ctaHref: banner.ctaHref,
        desktopImageId: products.get(banner.productSlug)!.mediaId,
        textTone: "DARK",
        position,
        isDemo: true,
      },
    });
  }

  const customerIds: string[] = [];
  for (const customer of DEMO_CUSTOMERS) {
    const record = await prisma.customer.create({
      data: {
        storeId: STORE,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isDemo: true,
        addresses: { create: { storeId: STORE, label: "Home", isDefault: true, ...customer.address, line2: customer.address.line2 ?? null } },
      },
    });
    customerIds.push(record.id);
  }

  for (const coupon of DEMO_COUPONS) {
    await prisma.discount.create({
      data: {
        storeId: STORE,
        title: coupon.title,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderValue: coupon.minOrderValue,
        publicLabel: coupon.publicLabel,
        startsAt: daysAgo(30, 0),
        isActive: true,
        isDemo: true,
      },
    });
  }

  await createOrders(products, customerIds, refs.taxFor);

  const author = await prisma.author.create({ data: { storeId: STORE, name: DEMO_AUTHOR.name, slug: DEMO_AUTHOR.slug, jobTitle: DEMO_AUTHOR.jobTitle, isDemo: true } });
  const topic =
    (await prisma.postTopic.findUnique({ where: { storeId_slug: { storeId: STORE, slug: "buying-guides" } } })) ??
    (await prisma.postTopic.create({ data: { storeId: STORE, name: "Buying guides", slug: "buying-guides" } }));
  for (const post of DEMO_POSTS) {
    await prisma.post.create({
      data: {
        storeId: STORE,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        contentHtml: post.html,
        coverId: products.get(post.coverProductSlug)!.mediaId,
        authorId: author.id,
        topicId: topic.id,
        status: "PUBLISHED",
        publishedAt: daysAgo(post.daysAgo, 8),
        readingMinutes: post.readingMinutes,
        metaDescription: post.excerpt,
        isDemo: true,
      },
    });
  }

  const sharedCache = expireSharedCache();
  const placeholders = DEMO_PRODUCTS.filter((product) => product.source === "placeholder").length;
  console.info(
    [
      `Demo data ready: ${products.size} products (${placeholders} with placeholder photos), ${BRANDS.length} brands, ${DEMO_ORDERS.length} orders, ${DEMO_CUSTOMERS.length} customers, ${DEMO_COUPONS.length} coupons, ${DEMO_POSTS.length} Journal posts.`,
      sharedCache ? "The shared page cache was refreshed." : "Restart a running dev server to see the new data.",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

