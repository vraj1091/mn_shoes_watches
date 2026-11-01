import messages from "@/messages/en.json";
import { resolve, type Mode } from "@/lib/design/tokens";
import { formatPrice } from "@/lib/format/money";

const PAGE_TOKENS = ["canvas", "surface", "line", "line-strong", "ink", "muted", "link", "accent", "primary", "on-primary"] as const;

/** The design tokens this page uses, as CSS variables, from lib/design/tokens.ts. */
const cssVars = (mode: Mode) => {
  const values = resolve(mode);
  return PAGE_TOKENS.map((token) => `--${token}:${values[token]}`).join(";");
};

/*
 * The 404 page proxy.ts sends for unknown shop URLs. Pages stream with a fixed 200 status, and a
 * proxy rewrite cannot carry a 404 either (tested 25 Oct 2026), so this one page is plain HTML
 * written here: real 404 status, works without JavaScript, and still offers search, the main
 * categories and bestsellers (Part 4, page 11). Colours come from lib/design/tokens.ts.
 */

export type NotFoundData = {
  storeName: string;
  departments: { name: string; path: string; children: { name: string; path: string }[] }[];
  bestsellers: { title: string; slug: string; minPrice: number }[];
};

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const href = (path: string) => `/${path.split("/").map(encodeURIComponent).join("/")}`;

export function notFoundHtml({ storeName, departments, bestsellers }: NotFoundData): string {
  const name = escape(storeName);
  const text = { ...messages.notFound, ...messages.common, search: messages.header };
  const categoryLinks = departments
    .flatMap((department) => [department, ...department.children.slice(0, 3)])
    .map((category) => `<li><a class="chip" href="${href(category.path)}">${escape(category.name)}</a></li>`)
    .join("");
  const bestsellerLinks = bestsellers
    .map(
      (product) =>
        `<li><a href="/product/${encodeURIComponent(product.slug)}"><span>${escape(product.title)}</span><span class="price">${escape(formatPrice(product.minPrice))}</span></a></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(text.metaTitle)} | ${name}</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
:root{color-scheme:light;${cssVars("light")}}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;${cssVars("dark")}}}
*{box-sizing:border-box}
body{margin:0;background:var(--canvas);color:var(--ink);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{border-bottom:1px solid var(--line)}
.wrap{max-width:72rem;margin:0 auto;padding:0 16px}
header .wrap{display:flex;align-items:center;min-height:56px}
.logo{font:600 19px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);text-decoration:none}
main{padding:64px 0 96px}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0}
h1{font:500 38px/1.15 "Bodoni 72",Didot,Georgia,serif;margin:12px 0 0;text-wrap:balance}
.intro{font-size:18px;color:var(--muted);max-width:60ch;margin:16px 0 0}
form{display:flex;gap:8px;max-width:36rem;margin:32px 0 0}
input{flex:1;min-height:44px;padding:0 12px;border:1px solid var(--line-strong);border-radius:2px;background:var(--canvas);color:var(--ink);font:inherit}
button,.button{display:inline-flex;align-items:center;min-height:44px;padding:0 20px;border:0;border-radius:2px;background:var(--primary);color:var(--on-primary);font-family:inherit;font-size:16px;font-weight:500;line-height:1;text-decoration:none;cursor:pointer}
h2{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:56px 0 16px;font-weight:600}
ul{list-style:none;margin:0;padding:0}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid var(--line-strong);border-radius:2px;color:var(--ink);text-decoration:none}
.chip:hover,.list a:hover{color:var(--accent)}
.list{border-top:1px solid var(--line);max-width:36rem}
.list a{display:flex;justify-content:space-between;gap:16px;min-height:48px;align-items:center;border-bottom:1px solid var(--line);color:var(--ink);text-decoration:none}
.price{font-variant-numeric:tabular-nums;white-space:nowrap}
.home{display:inline-block;margin-top:48px;color:var(--link)}
a:focus-visible,input:focus-visible,button:focus-visible{outline:2px solid var(--link);outline-offset:2px}
@media (min-width:1024px){h1{font-size:48px}}
</style>
</head>
<body>
<header><div class="wrap"><a class="logo" href="/">${name}</a></div></header>
<main class="wrap">
<p class="eyebrow">404</p>
<h1>${escape(text.title)}</h1>
<p class="intro">${escape(text.intro)}</p>
<form action="/search" role="search"><label for="q" style="position:absolute;left:-9999px">${escape(text.search.searchLabel)}</label><input id="q" name="q" type="search" placeholder="${escape(text.search.searchPlaceholder)}"><button type="submit">${escape(messages.common.search)}</button></form>
${categoryLinks ? `<h2>${escape(text.popular)}</h2><ul class="chips">${categoryLinks}</ul>` : ""}
${bestsellerLinks ? `<h2>${escape(text.bestsellers)}</h2><ul class="list">${bestsellerLinks}</ul>` : ""}
<a class="home" href="/">${escape(text.backToShop)}</a>
</main>
</body>
</html>`;
}
