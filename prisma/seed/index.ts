/*
 * npm run db:seed
 *
 * Creates the store, its settings and location (with clearly marked placeholders), the owner
 * account from SEED_OWNER_* variables, and — only when the catalogue is empty — the category
 * tree, attribute templates, tax classes, size chart and sample products. Search synonyms,
 * "complete the look" pairings and sample collections are each added only when their own
 * table is empty. Safe to run again: it never overwrites the owner's password or any edits.
 */
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type Prisma } from "../../lib/generated/prisma/client";
import { databaseUrl } from "../../lib/db/paths";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../../lib/auth/password";
import { buildSearchText, listingFields } from "../../lib/catalog/listing";
import {
  ATTRIBUTES,
  CATEGORY_TREE,
  COLLECTIONS,
  COMPLETE_THE_LOOK,
  PRODUCTS,
  SHOE_SIZE_CHART,
  SYNONYMS,
  TAX_CLASSES,
  TEMPLATES,
  type CategorySeed,
} from "./catalog";

if (existsSync(".env")) process.loadEnvFile(".env");

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl() }) });
const STORE = "main";

const slugOf = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function richText(paragraphs: string[]) {
  return {
    json: { type: "doc", content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })) },
    html: paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join(""),
  };
}

async function seedStore() {
  await prisma.store.upsert({
    where: { id: STORE },
    create: { id: STORE, name: "MN Shoes & Watches", domain: process.env.APP_URL ? new URL(process.env.APP_URL).host : "localhost" },
    update: {},
  });

  await prisma.storeSettings.upsert({
    where: { storeId: STORE },
    create: {
      storeId: STORE,
      storeName: "MN Shoes & Watches",
      legalName: "[Registered business name]",
      email: "[shop email]",
      phone: "+91 00000 00000",
      whatsapp: null,
      gstin: null,
      gstStateCode: "24",
      trustStats: [],
      socialLinks: {},
      announcementEnabled: false,
      codEnabled: true,
      codFee: 0,
      freeShippingThreshold: null,
      returnsEnabled: true,
      exchangesEnabled: true,
      returnWindowDays: 7,
      lowStockThreshold: 5,
      reviewRequestDelayDays: 5,
    },
    update: {},
  });

  const hasLocation = await prisma.storeLocation.count({ where: { storeId: STORE } });
  if (!hasLocation) {
    await prisma.storeLocation.create({
      data: {
        storeId: STORE,
        name: "MN Shoes & Watches, Kalol",
        slug: "kalol",
        isPrimary: true,
        line1: "[Street address]",
        city: "Kalol",
        district: "Gandhinagar",
        state: "Gujarat",
        stateCode: "24",
        pinCode: "[PIN code]",
        phone: "+91 00000 00000",
        openingHours: [],
      },
    });
  }
}

async function seedOwner() {
  const email = process.env.SEED_OWNER_EMAIL?.trim().toLowerCase();
  const name = process.env.SEED_OWNER_NAME?.trim() || "Owner";
  const password = process.env.SEED_OWNER_PASSWORD ?? "";

  const existingOwner = await prisma.staffUser.findFirst({ where: { storeId: STORE, role: "OWNER" } });
  if (existingOwner) {
    console.info(`Owner account already exists (${existingOwner.email}); left unchanged.`);
    return;
  }
  if (!email || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in .env to create the owner account.`);
  }

  const id = randomUUID();
  await prisma.staffUser.create({
    data: {
      id,
      storeId: STORE,
      name,
      email,
      emailVerified: true,
      role: "OWNER",
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) },
      },
    },
  });
  console.info(`Created owner account ${email}.`);
}

async function seedCatalogue() {
  if (await prisma.category.count({ where: { storeId: STORE } })) {
    console.info("Catalogue already has categories; skipped catalogue seed.");
    return;
  }

  // Tax classes
  const taxClassIds = new Map<string, string>();
  for (const taxClass of TAX_CLASSES) {
    const created = await prisma.taxClass.create({
      data: {
        storeId: STORE,
        name: taxClass.name,
        hsnCode: taxClass.hsnCode,
        slabs: { create: taxClass.slabs.map((slab) => ({ storeId: STORE, maxUnitValue: slab.maxUnitValue, rateBp: slab.rateBp })) },
      },
    });
    taxClassIds.set(taxClass.name, created.id);
  }

  // Attributes and their values
  const attributeIds = new Map<string, string>();
  const valueIds = new Map<string, string>(); // `${code}:${value}` → id
  for (const [position, attribute] of ATTRIBUTES.entries()) {
    const created = await prisma.attribute.create({
      data: {
        storeId: STORE,
        code: attribute.code,
        name: attribute.name,
        type: attribute.type,
        unit: attribute.unit,
        isVariantAxis: attribute.isVariantAxis ?? false,
        isFilterable: attribute.isFilterable ?? true,
        filterStyle: attribute.filterStyle ?? "CHECKBOX",
        helpText: attribute.helpText,
        position,
      },
    });
    attributeIds.set(attribute.code, created.id);
    for (const [valuePosition, raw] of (attribute.values ?? []).entries()) {
      const value = typeof raw === "string" ? { value: raw } : raw;
      const createdValue = await prisma.attributeValue.create({
        data: {
          storeId: STORE,
          attributeId: created.id,
          value: value.value,
          slug: slugOf(value.value),
          swatchHex: value.swatchHex,
          sortKey: value.sortKey,
          position: valuePosition,
        },
      });
      valueIds.set(`${attribute.code}:${value.value}`, createdValue.id);
    }
  }

  // Attribute templates
  const templateIds = new Map<string, string>();
  for (const template of TEMPLATES) {
    const created = await prisma.attributeTemplate.create({
      data: {
        storeId: STORE,
        code: template.code,
        name: template.name,
        attributes: {
          create: template.attributes.map((code, position) => ({ attributeId: attributeIds.get(code)!, position })),
        },
      },
    });
    templateIds.set(template.code, created.id);
  }

  const sizeChart = await prisma.sizeChart.create({
    data: {
      storeId: STORE,
      name: SHOE_SIZE_CHART.name,
      table: SHOE_SIZE_CHART.table,
      howToMeasure: richText(SHOE_SIZE_CHART.howToMeasure).json,
      howToMeasureHtml: `<ol>${SHOE_SIZE_CHART.howToMeasure.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`,
    },
  });

  // Category tree
  const categoryIds = new Map<string, string>(); // path → id
  async function createCategory(seed: CategorySeed, parent: { id: string; path: string } | null, depth: number, position: number) {
    const path = parent ? `${parent.path}/${seed.slug}` : seed.slug;
    const created = await prisma.category.create({
      data: {
        storeId: STORE,
        parentId: parent?.id,
        name: seed.name,
        slug: seed.slug,
        path,
        depth,
        position,
        intro: seed.intro,
        attributeTemplateId: seed.template ? templateIds.get(seed.template) : undefined,
        taxClassId: seed.taxClass ? taxClassIds.get(seed.taxClass) : undefined,
        sizeChartId: seed.sizeChart ? sizeChart.id : undefined,
        filters: seed.filters
          ? { create: seed.filters.map((code, index) => ({ attributeId: attributeIds.get(code)!, position: index })) }
          : undefined,
      },
    });
    categoryIds.set(path, created.id);
    for (const [index, child] of (seed.children ?? []).entries()) {
      await createCategory(child, { id: created.id, path }, depth + 1, index);
    }
  }
  for (const [index, root] of CATEGORY_TREE.entries()) await createCategory(root, null, 0, index);

  const sampleTag = await prisma.tag.create({ data: { storeId: STORE, name: "Sample", slug: "sample" } });

  // Products
  const now = new Date();
  for (const [productIndex, seed] of PRODUCTS.entries()) {
    const template = TEMPLATES.find((item) => item.code === seed.template)!;
    const description = richText(seed.description);

    // Every combination of the variant axes (a single default variant when there are none).
    const combinations: string[][] = seed.axes.reduce<string[][]>(
      (acc, [, values]) => acc.flatMap((combo) => values.map((value) => [...combo, value])),
      [[]],
    );

    const variants = combinations.map((values, index) => {
      const price = typeof seed.price === "function" ? seed.price(values) : seed.price;
      const compareAtPrice = typeof seed.compareAtPrice === "function" ? seed.compareAtPrice(values) : (seed.compareAtPrice ?? null);
      // A spread of stock levels so the store shows in-stock, low-stock and sold-out states.
      const stockOnHand = [6, 3, 0, 8, 2, 5, 12, 4, 1, 7][(productIndex * 3 + index) % 10]!;
      const skuSuffix = values.map((value) => value.replace(/^UK /, "").replace(/ (ml|in)$/, "").replace(/[^A-Za-z0-9.]/g, "").slice(0, 6).toUpperCase());
      return {
        values,
        sku: [seed.skuPrefix, ...skuSuffix].join("-"),
        title: values.join(" / ") || "Default",
        price,
        compareAtPrice,
        stockOnHand,
        position: index,
      };
    });

    const listing = listingFields(variants.map((variant) => ({ ...variant, isActive: true })));
    const attributeWords = Object.values(seed.attributes).flat().map(String);
    // Ancestor categories too, so "men's shoes" finds an Oxford filed under Formal → Oxfords.
    const ancestorPaths = new Set(seed.categories.flatMap((path) => path.split("/").map((_, i, parts) => parts.slice(0, i + 1).join("/"))));
    const categoryNames = await prisma.category.findMany({
      where: { id: { in: [...ancestorPaths].map((path) => categoryIds.get(path)!) } },
      select: { name: true },
    });

    const product = await prisma.product.create({
      data: {
        storeId: STORE,
        title: seed.title,
        slug: seed.slug,
        status: "ACTIVE",
        publishedAt: now,
        templateId: templateIds.get(seed.template),
        primaryCategoryId: categoryIds.get(seed.categories[0]!),
        gender: seed.gender,
        summary: seed.summary,
        description: description.json,
        descriptionHtml: description.html,
        highlights: seed.highlights,
        care: seed.care,
        warranty: seed.warranty,
        warrantyMonths: seed.warrantyMonths,
        ...listing,
        searchText: buildSearchText([
          seed.title,
          ...categoryNames.map((category) => category.name),
          ...attributeWords,
          ...combinations.flat(),
        ]),
        categories: {
          create: seed.categories.map((path, position) => ({ categoryId: categoryIds.get(path)!, position })),
        },
        tags: { create: [{ tagId: sampleTag.id }] },
      },
    });

    // Product-level attribute values
    const attributeRows: Prisma.ProductAttributeValueCreateManyInput[] = [];
    for (const [code, raw] of Object.entries(seed.attributes)) {
      const attributeId = attributeIds.get(code);
      if (!attributeId || !template.attributes.includes(code)) throw new Error(`${seed.title}: unknown attribute ${code}`);
      const definition = ATTRIBUTES.find((attribute) => attribute.code === code)!;
      if (definition.type === "NUMBER") {
        attributeRows.push({ storeId: STORE, productId: product.id, attributeId, numberValue: Number(raw) });
        continue;
      }
      for (const value of Array.isArray(raw) ? raw : [String(raw)]) {
        const valueId = valueIds.get(`${code}:${value}`);
        if (!valueId) throw new Error(`${seed.title}: "${value}" is not a value of ${code}`);
        attributeRows.push({ storeId: STORE, productId: product.id, attributeId, valueId });
      }
    }
    await prisma.productAttributeValue.createMany({ data: attributeRows });

    // Variant axes, variants and their option values
    const options: { id: string }[] = [];
    for (const [position, [code]] of seed.axes.entries()) {
      options.push(
        await prisma.productOption.create({
          data: { storeId: STORE, productId: product.id, attributeId: attributeIds.get(code)!, position },
        }),
      );
    }
    for (const variant of variants) {
      await prisma.productVariant.create({
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
              const valueId = valueIds.get(`${code}:${value}`);
              if (!valueId) throw new Error(`${seed.title}: "${value}" is not a value of ${code}`);
              return { optionId: options[index]!.id, valueId };
            }),
          },
          movements: {
            create: {
              storeId: STORE,
              delta: variant.stockOnHand,
              balanceAfter: variant.stockOnHand,
              reason: "STOCK_RECEIVED",
              note: "Opening stock (sample data)",
            },
          },
        },
      });
    }
  }

  const counts = await Promise.all([prisma.category.count(), prisma.product.count(), prisma.productVariant.count()]);
  console.info(`Seeded ${counts[0]} categories, ${counts[1]} products and ${counts[2]} variants.`);
}

async function seedSynonyms() {
  if (await prisma.searchSynonym.count({ where: { storeId: STORE } })) return;
  await prisma.searchSynonym.createMany({ data: SYNONYMS.map((entry) => ({ storeId: STORE, ...entry })) });
  console.info(`Seeded ${SYNONYMS.length} search synonyms.`);
}

async function seedPairings() {
  if (await prisma.productRelation.count()) return;
  const products = await prisma.product.findMany({ where: { storeId: STORE }, select: { id: true, slug: true } });
  const ids = new Map(products.map((product) => [product.slug, product.id]));
  const rows = Object.entries(COMPLETE_THE_LOOK).flatMap(([from, related]) =>
    related
      .filter((slug) => ids.has(from) && ids.has(slug))
      .map((slug, position) => ({ productId: ids.get(from)!, relatedId: ids.get(slug)!, type: "COMPLETE_THE_LOOK" as const, position })),
  );
  if (rows.length) await prisma.productRelation.createMany({ data: rows });
}

async function seedCollections() {
  if (await prisma.collection.count({ where: { storeId: STORE } })) return;
  for (const collection of COLLECTIONS) {
    await prisma.collection.create({
      data: {
        storeId: STORE,
        title: collection.title,
        slug: collection.slug,
        type: "RULE",
        rules: collection.rules as unknown as Prisma.InputJsonValue,
        matchAll: true,
        defaultSort: collection.defaultSort,
        landingPath: collection.landingPath,
        intro: collection.intro,
      },
    });
  }
  console.info(`Seeded ${COLLECTIONS.length} collections.`);
}

async function main() {
  await seedStore();
  await seedOwner();
  await seedCatalogue();
  await seedSynonyms();
  await seedPairings();
  await seedCollections();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
