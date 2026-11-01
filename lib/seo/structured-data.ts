/**
 * schema.org structured data (JSON-LD), so search engines and AI answers read prices, stock,
 * ratings, breadcrumbs and the shop's details from the page rather than guessing. Every builder is
 * pure and takes the site's base URL, because schema.org wants absolute URLs.
 */

export type JsonLdObject = { "@context": "https://schema.org"; "@type": string } & Record<string, unknown>;

const SCHEMA = "https://schema.org" as const;

const absolute = (base: string, path: string) => new URL(path, base).toString();

/** Prices are stored in paise; schema.org wants the amount in rupees. */
const rupees = (paise: number) => (paise / 100).toFixed(2);

export function breadcrumbList(base: string, crumbs: { name: string; href: string }[]): JsonLdObject {
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absolute(base, crumb.href) })),
  };
}

type ProductInput = {
  title: string;
  slug: string;
  summary: string | null;
  images: { url: string }[];
  brand: { name: string } | null;
  variants: { sku: string; price: number; stock: number }[];
  ratingAvg: number;
  ratingCount: number;
};

type ReviewInput = { authorName: string; rating: number; body: string | null; publishedAt: Date | null };

export function productLd(base: string, product: ProductInput, reviews: ReviewInput[], seller: string): JsonLdObject {
  const url = absolute(base, `/product/${product.slug}`);
  const prices = product.variants.map((variant) => variant.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const availability = product.variants.some((variant) => variant.stock > 0) ? `${SCHEMA}/InStock` : `${SCHEMA}/OutOfStock`;
  const shared = { priceCurrency: "INR", availability, itemCondition: `${SCHEMA}/NewCondition`, seller: { "@type": "Organization", name: seller } };
  const offers =
    low === high
      ? { "@type": "Offer", url, price: rupees(low), ...shared }
      : { "@type": "AggregateOffer", url, lowPrice: rupees(low), highPrice: rupees(high), offerCount: product.variants.length, ...shared };

  return {
    "@context": SCHEMA,
    "@type": "Product",
    name: product.title,
    url,
    ...(product.summary ? { description: product.summary } : {}),
    ...(product.images.length > 0 ? { image: product.images.map((image) => absolute(base, image.url)) } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.variants.length === 1 ? { sku: product.variants[0]!.sku } : {}),
    ...(prices.length > 0 ? { offers } : {}),
    ...(product.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg.toFixed(1), reviewCount: product.ratingCount, bestRating: 5, worstRating: 1 } }
      : {}),
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 5).map((review) => ({
            "@type": "Review",
            author: { "@type": "Person", name: review.authorName },
            reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
            ...(review.body ? { reviewBody: review.body } : {}),
            ...(review.publishedAt ? { datePublished: review.publishedAt.toISOString().slice(0, 10) } : {}),
          })),
        }
      : {}),
  };
}

export function faqPage(faqs: { question: string; answer: string }[]): JsonLdObject {
  return {
    "@context": SCHEMA,
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
  };
}

type PostInput = { slug: string; title: string; excerpt: string | null; image: { url: string } | null; publishedAt: Date | null; updatedAt: Date; author: string | null };

export function articleLd(base: string, post: PostInput, publisher: string): JsonLdObject {
  return {
    "@context": SCHEMA,
    "@type": "BlogPosting",
    headline: post.title,
    mainEntityOfPage: absolute(base, `/journal/${post.slug}`),
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.image ? { image: absolute(base, post.image.url) } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt.toISOString() } : {}),
    dateModified: post.updatedAt.toISOString(),
    ...(post.author ? { author: { "@type": "Person", name: post.author } } : {}),
    publisher: { "@type": "Organization", name: publisher, logo: { "@type": "ImageObject", url: absolute(base, "/icon.svg") } },
  };
}

type StoreInput = {
  name: string;
  phone: string | null;
  email: string | null;
  address: { street: string | null; city: string | null; state: string | null; pin: string | null } | null;
};

/**
 * The shop as a local business, plus the website's name. Details still showing the seed's
 * [placeholder] text are left out rather than published (`isPlaceholder` decides).
 */
export function storeLd(base: string, store: StoreInput, isPlaceholder: (value: string | null) => boolean): JsonLdObject[] {
  const real = (value: string | null) => (value && !isPlaceholder(value) ? value : undefined);
  const address = store.address
    ? Object.fromEntries(
        Object.entries({
          streetAddress: real(store.address.street),
          addressLocality: real(store.address.city),
          addressRegion: real(store.address.state),
          postalCode: real(store.address.pin),
        }).filter(([, value]) => value !== undefined),
      )
    : {};
  return [
    {
      "@context": SCHEMA,
      "@type": "Store",
      name: store.name,
      url: absolute(base, "/"),
      logo: absolute(base, "/icon.svg"),
      ...(real(store.phone) ? { telephone: real(store.phone) } : {}),
      ...(real(store.email) ? { email: real(store.email) } : {}),
      ...(Object.keys(address).length > 0 ? { address: { "@type": "PostalAddress", addressCountry: "IN", ...address } } : {}),
    },
    { "@context": SCHEMA, "@type": "WebSite", name: store.name, url: absolute(base, "/") },
  ];
}
