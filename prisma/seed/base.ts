/*
 * Store structure: the store, its settings and location (with clearly marked placeholders), the
 * owner account, the category tree, attributes and templates, tax classes, size chart, search
 * synonyms, collections, shipping zones and the policy pages. None of it is demo data, so it is
 * kept when demo data is removed. Safe to run again: it only adds what is missing and never
 * overwrites the owner's password or any edits.
 */
import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../lib/generated/prisma/client";
import { hashPassword, MIN_PASSWORD_LENGTH } from "../../lib/auth/password";
import { ATTRIBUTES, CATEGORY_TREE, COLLECTIONS, SHOE_SIZE_CHART, SYNONYMS, TAX_CLASSES, TEMPLATES, type CategorySeed } from "./catalog";
import { PAGES } from "./pages";

export const STORE = "main";

/** Development-only admin login, documented in the README. Production refuses to use it. */
export const DEFAULT_ADMIN = { email: "admin@example.com", password: "MnShoes-Admin-2026" };

export const slugOf = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function richText(paragraphs: string[]) {
  return {
    json: { type: "doc", content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })) },
    html: paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join(""),
  };
}

async function seedStore(prisma: PrismaClient) {
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
      announcementEnabled: true,
      announcementText: "Free delivery on orders above ₹1,999. Cash on delivery available.",
      announcementHref: "/policies/shipping",
      codEnabled: true,
      codFee: 49_00,
      codMaxOrder: 50_000_00,
      freeShippingThreshold: 1_999_00,
      dispatchCutoffHour: 14,
      processingDays: 1,
      returnsEnabled: true,
      exchangesEnabled: true,
      returnWindowDays: 7,
      lowStockThreshold: 5,
      reviewRequestDelayDays: 5,
    },
    update: {},
  });

  // Stores seeded before free delivery was set up get the brief's defaults; a value the owner set is kept.
  await prisma.storeSettings.updateMany({
    where: { storeId: STORE, freeShippingThreshold: null },
    data: { freeShippingThreshold: 1_999_00, codFee: 49_00, codMaxOrder: 50_000_00 },
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

/**
 * The owner account. ADMIN_EMAIL / ADMIN_PASSWORD from .env (SEED_OWNER_* still work). Without
 * them, development uses DEFAULT_ADMIN; production refuses, so a live shop never has a known password.
 */
async function seedOwner(prisma: PrismaClient) {
  const existingOwner = await prisma.staffUser.findFirst({ where: { storeId: STORE, role: "OWNER" } });
  if (existingOwner) {
    console.info(`Owner account already exists (${existingOwner.email}); left unchanged.`);
    return;
  }
  const production = process.env.NODE_ENV === "production";
  const email = (process.env.ADMIN_EMAIL ?? process.env.SEED_OWNER_EMAIL ?? (production ? "" : DEFAULT_ADMIN.email)).trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? process.env.SEED_OWNER_PASSWORD ?? (production ? "" : DEFAULT_ADMIN.password);
  const name = (process.env.ADMIN_NAME ?? process.env.SEED_OWNER_NAME)?.trim() || "Owner";
  if (!email || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Set ADMIN_EMAIL and ADMIN_PASSWORD (at least ${MIN_PASSWORD_LENGTH} characters) in .env to create the owner account.`);
  }
  if (production && password === DEFAULT_ADMIN.password) {
    throw new Error("ADMIN_PASSWORD is the documented development password. Choose your own before seeding a live shop.");
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
      accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: await hashPassword(password) } },
    },
  });
  console.info(`Created owner account ${email}.`);
}

/** Attributes, their values and template membership: adds whatever is missing, keeps edits. */
async function seedAttributes(prisma: PrismaClient) {
  const existing = await prisma.attribute.findMany({ where: { storeId: STORE }, include: { values: true } });
  const byCode = new Map(existing.map((attribute) => [attribute.code, attribute]));
  for (const [position, attribute] of ATTRIBUTES.entries()) {
    let record = byCode.get(attribute.code);
    if (!record) {
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
      record = { ...created, values: [] };
    }
    const have = new Set(record.values.map((value) => value.value));
    let valuePosition = record.values.length;
    for (const raw of attribute.values ?? []) {
      const value = typeof raw === "string" ? { value: raw } : raw;
      if (have.has(value.value)) continue;
      await prisma.attributeValue.create({
        data: {
          storeId: STORE,
          attributeId: record.id,
          value: value.value,
          slug: slugOf(value.value),
          swatchHex: value.swatchHex,
          sortKey: value.sortKey,
          position: valuePosition++,
        },
      });
    }
  }

  const attributeIds = new Map((await prisma.attribute.findMany({ where: { storeId: STORE } })).map((attribute) => [attribute.code, attribute.id]));
  for (const template of TEMPLATES) {
    let record = await prisma.attributeTemplate.findFirst({ where: { storeId: STORE, code: template.code }, include: { attributes: true } });
    if (!record) {
      record = await prisma.attributeTemplate.create({ data: { storeId: STORE, code: template.code, name: template.name }, include: { attributes: true } });
    }
    const linked = new Set(record.attributes.map((entry) => entry.attributeId));
    let position = record.attributes.length;
    for (const code of template.attributes) {
      const attributeId = attributeIds.get(code)!;
      if (!linked.has(attributeId)) {
        await prisma.templateAttribute.create({ data: { templateId: record.id, attributeId, position: position++ } });
      }
    }
  }
  return attributeIds;
}

async function seedCatalogueStructure(prisma: PrismaClient, attributeIds: Map<string, string>) {
  const fresh = (await prisma.category.count({ where: { storeId: STORE } })) === 0;
  const taxClassIds = new Map<string, string>();
  for (const taxClass of TAX_CLASSES) {
    const found = await prisma.taxClass.findFirst({ where: { storeId: STORE, name: taxClass.name } });
    const record =
      found ??
      (await prisma.taxClass.create({
        data: {
          storeId: STORE,
          name: taxClass.name,
          hsnCode: taxClass.hsnCode,
          slabs: { create: taxClass.slabs.map((slab) => ({ storeId: STORE, maxUnitValue: slab.maxUnitValue, rateBp: slab.rateBp })) },
        },
      }));
    taxClassIds.set(taxClass.name, record.id);
  }

  const templateIds = new Map((await prisma.attributeTemplate.findMany({ where: { storeId: STORE } })).map((template) => [template.code, template.id]));

  let sizeChart = await prisma.sizeChart.findFirst({ where: { storeId: STORE, name: SHOE_SIZE_CHART.name } });
  sizeChart ??= await prisma.sizeChart.create({
    data: {
      storeId: STORE,
      name: SHOE_SIZE_CHART.name,
      table: SHOE_SIZE_CHART.table,
      howToMeasure: richText(SHOE_SIZE_CHART.howToMeasure).json,
      howToMeasureHtml: `<ol>${SHOE_SIZE_CHART.howToMeasure.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>`,
    },
  });

  // Creates any category that does not exist yet; existing ones keep the owner's edits, except that
  // a category with no filter list of its own gets the seeded one.
  async function ensureCategory(seed: CategorySeed, parent: { id: string; path: string } | null, depth: number, position: number) {
    const path = parent ? `${parent.path}/${seed.slug}` : seed.slug;
    let category = await prisma.category.findUnique({ where: { storeId_path: { storeId: STORE, path } }, include: { filters: true } });
    if (!category) {
      category = await prisma.category.create({
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
          sizeChartId: seed.sizeChart ? sizeChart!.id : undefined,
          filters: seed.filters ? { create: seed.filters.map((code, index) => ({ attributeId: attributeIds.get(code)!, position: index })) } : undefined,
        },
        include: { filters: true },
      });
    } else if (seed.filters && category.filters.length === 0) {
      await prisma.categoryFilter.createMany({
        data: seed.filters.map((code, index) => ({ categoryId: category!.id, attributeId: attributeIds.get(code)!, position: index })),
      });
    }
    for (const [index, child] of (seed.children ?? []).entries()) {
      await ensureCategory(child, { id: category.id, path }, depth + 1, index);
    }
  }
  for (const [index, root] of CATEGORY_TREE.entries()) await ensureCategory(root, null, 0, index);
  if (fresh) console.info(`Seeded ${await prisma.category.count({ where: { storeId: STORE } })} categories.`);
}

async function seedSynonyms(prisma: PrismaClient) {
  if (await prisma.searchSynonym.count({ where: { storeId: STORE } })) return;
  await prisma.searchSynonym.createMany({ data: SYNONYMS.map((entry) => ({ storeId: STORE, ...entry })) });
  console.info(`Seeded ${SYNONYMS.length} search synonyms.`);
}

async function seedCollections(prisma: PrismaClient) {
  for (const collection of COLLECTIONS) {
    const exists = await prisma.collection.findUnique({ where: { storeId_slug: { storeId: STORE, slug: collection.slug } } });
    if (exists) continue;
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
}

/** Delivery zones behind the PIN-code estimate and shipping charges (see the shipping policy page). */
async function seedShipping(prisma: PrismaClient) {
  if (await prisma.shippingZone.count({ where: { storeId: STORE } })) return;
  const zones = [
    { name: "Kalol and Gandhinagar", stateCodes: ["24"], pinPrefixes: ["3827", "3820", "3824", "3825"], minDays: 1, maxDays: 1 },
    { name: "Gujarat", stateCodes: ["24"], pinPrefixes: null, minDays: 1, maxDays: 2 },
    { name: "Rest of India", stateCodes: [], pinPrefixes: null, minDays: 3, maxDays: 6 },
  ];
  for (const [position, zone] of zones.entries()) {
    await prisma.shippingZone.create({
      data: {
        storeId: STORE,
        name: zone.name,
        stateCodes: zone.stateCodes,
        pinPrefixes: zone.pinPrefixes ?? undefined,
        position,
        rates: {
          create: {
            storeId: STORE,
            name: "Standard delivery",
            code: "standard",
            type: "FLAT",
            price: 99_00,
            minDays: zone.minDays,
            maxDays: zone.maxDays,
            codAvailable: true,
          },
        },
      },
    });
  }
}

async function seedPages(prisma: PrismaClient) {
  for (const page of PAGES) {
    const exists = await prisma.page.findUnique({ where: { storeId_slug: { storeId: STORE, slug: page.slug } } });
    if (exists) continue;
    await prisma.page.create({
      data: {
        storeId: STORE,
        slug: page.slug,
        kind: page.kind,
        title: page.title,
        contentHtml: page.html,
        faqs: page.faqs,
        status: "PUBLISHED",
        publishedAt: new Date(),
        metaDescription: page.metaDescription,
      },
    });
  }
}

export async function seedBase(prisma: PrismaClient) {
  await seedStore(prisma);
  await seedOwner(prisma);
  const attributeIds = await seedAttributes(prisma);
  await seedCatalogueStructure(prisma, attributeIds);
  await seedSynonyms(prisma);
  await seedCollections(prisma);
  await seedShipping(prisma);
  await seedPages(prisma);
}
