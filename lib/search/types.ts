/** Response of /api/search/suggest. */
export type Suggestions = {
  products: { title: string; href: string; price: string; image: string | null }[];
  categories: { name: string; context: string | null; href: string }[];
  corrected: string | null;
};
