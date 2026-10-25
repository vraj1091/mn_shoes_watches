// Measures the gzipped JavaScript a page loads: fetches the HTML from a running production
// server, collects every script it references, and gzips each one as a browser would receive it.
// Usage: node scripts/check-js-budget.mjs http://localhost:3210/ [budgetKB]
import { gzipSync } from "node:zlib";

const [url = "http://localhost:3000/", budgetArg = "120"] = process.argv.slice(2);
const budget = Number(budgetArg) * 1024;

const html = await (await fetch(url)).text();
// Modern browsers skip noModule scripts (legacy polyfills), so they are not counted.
const sources = [
  ...new Set(
    [...html.matchAll(/<script\b[^>]*>/g)]
      .map((match) => match[0])
      .filter((tag) => !/\bnoModule\b/i.test(tag))
      .map((tag) => /\bsrc="([^"]+)"/.exec(tag)?.[1])
      .filter(Boolean),
  ),
];

let total = 0;
const rows = [];
for (const src of sources) {
  const body = Buffer.from(await (await fetch(new URL(src, url))).arrayBuffer());
  const gz = gzipSync(body, { level: 9 }).length;
  total += gz;
  rows.push([src.split("/").pop(), (body.length / 1024).toFixed(1), (gz / 1024).toFixed(1)]);
}

rows.sort((a, b) => Number(b[2]) - Number(a[2]));
for (const [name, raw, gz] of rows) console.log(`${gz.padStart(7)} KB gz  ${raw.padStart(7)} KB  ${name}`);
console.log(`\nTotal ${(total / 1024).toFixed(1)} KB gzipped across ${rows.length} scripts (budget ${budgetArg} KB).`);
process.exitCode = total > budget ? 1 : 0;
