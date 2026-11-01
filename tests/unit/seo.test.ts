import { describe, expect, it } from "vitest";
import { isPlaceholder } from "@/lib/setup-checklist";
import { articleLd, breadcrumbList, faqPage, productLd, storeLd } from "@/lib/seo/structured-data";
import { openGraph } from "@/lib/seo/open-graph";

const BASE = "https://mnshoes.example";

const product = {
  title: "Kensington oxford, black",
  slug: "kensington-oxford",
  summary: "Plain-toe oxford in black calf.",
  images: [{ url: "/media/products/k/1.webp" }],
  brand: { name: "MN Atelier" },
  variants: [
    { sku: "KEN-7", price: 4_499_00, stock: 0 },
    { sku: "KEN-8", price: 4_499_00, stock: 3 },
  ],
  ratingAvg: 4.25,
  ratingCount: 2,
};

describe("structured data", () => {
  it("gives breadcrumbs absolute URLs in order", () => {
    const list = breadcrumbList(BASE, [
      { name: "Home", href: "/" },
      { name: "Men's shoes", href: "/mens-shoes" },
    ]);
    expect(list.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://mnshoes.example/" },
      { "@type": "ListItem", position: 2, name: "Men's shoes", item: "https://mnshoes.example/mens-shoes" },
    ]);
  });

  it("prices a product in rupees, in stock if any size is", () => {
    const ld = productLd(BASE, product, [], "MN Shoes & Watches");
    expect(ld.offers).toMatchObject({ "@type": "Offer", price: "4499.00", priceCurrency: "INR", availability: "https://schema.org/InStock" });
    expect(ld.image).toEqual(["https://mnshoes.example/media/products/k/1.webp"]);
    expect(ld.aggregateRating).toMatchObject({ ratingValue: "4.3", reviewCount: 2 });
    expect(ld).not.toHaveProperty("sku");
  });

  it("gives a price range when sizes cost different amounts, and out of stock when none are left", () => {
    const ld = productLd(BASE, { ...product, ratingCount: 0, variants: [{ sku: "A", price: 999_00, stock: 0 }, { sku: "B", price: 1_299_00, stock: 0 }] }, [], "Shop");
    expect(ld.offers).toMatchObject({ "@type": "AggregateOffer", lowPrice: "999.00", highPrice: "1299.00", offerCount: 2, availability: "https://schema.org/OutOfStock" });
    expect(ld).not.toHaveProperty("aggregateRating");
  });

  it("includes up to five reviews with their dates", () => {
    const reviews = Array.from({ length: 7 }, (_, index) => ({ authorName: `R${index}`, rating: 5, body: "Fits well.", publishedAt: new Date("2026-10-01T10:00:00Z") }));
    const ld = productLd(BASE, product, reviews, "Shop");
    expect(ld.review).toHaveLength(5);
    expect((ld.review as Record<string, unknown>[])[0]).toMatchObject({ author: { name: "R0" }, reviewRating: { ratingValue: 5 }, datePublished: "2026-10-01" });
  });

  it("describes questions and answers", () => {
    expect(faqPage([{ question: "Do you deliver to Kalol?", answer: "Yes, the next day." }]).mainEntity).toEqual([
      { "@type": "Question", name: "Do you deliver to Kalol?", acceptedAnswer: { "@type": "Answer", text: "Yes, the next day." } },
    ]);
  });

  it("describes a Journal post", () => {
    const ld = articleLd(BASE, { slug: "watch-size", title: "Watch size", excerpt: null, image: { url: "/demo/w.webp" }, publishedAt: new Date("2026-10-20T00:00:00Z"), updatedAt: new Date("2026-10-21T00:00:00Z"), author: "Mehul" }, "Shop");
    expect(ld).toMatchObject({ "@type": "BlogPosting", mainEntityOfPage: "https://mnshoes.example/journal/watch-size", image: "https://mnshoes.example/demo/w.webp", author: { name: "Mehul" } });
    expect(ld).not.toHaveProperty("description");
  });

  it("leaves the seed's [placeholder] shop details out", () => {
    const [store, site] = storeLd(
      BASE,
      { name: "MN Shoes & Watches", phone: "+91 00000 00000", email: "hello@example.com", address: { street: "[Street address]", city: "Kalol", state: "Gujarat", pin: "[PIN code]" } },
      isPlaceholder,
    );
    expect(store).not.toHaveProperty("telephone");
    expect(store!.address).toEqual({ "@type": "PostalAddress", addressCountry: "IN", addressLocality: "Kalol", addressRegion: "Gujarat" });
    expect(site).toMatchObject({ "@type": "WebSite", url: "https://mnshoes.example/" });
  });
});

describe("link previews", () => {
  it("keeps the shared fields when a page adds its own", () => {
    expect(openGraph("Shop", { title: "Oxford", images: [{ url: "/p.webp" }] })).toEqual({ siteName: "Shop", locale: "en_IN", type: "website", title: "Oxford", images: [{ url: "/p.webp" }] });
    expect(openGraph("Shop").images).toEqual([{ url: "/og.png", width: 1200, height: 630 }]);
  });
});
