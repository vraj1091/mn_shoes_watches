// Writes app/theme.css, app/icon.svg and public/og.png from lib/design/tokens.ts. Usage: npm run tokens
import { writeFileSync } from "node:fs";
import sharp from "sharp";
import { iconSvg, ogImageSvg, themeCss } from "../lib/design/tokens";

writeFileSync("app/theme.css", themeCss());
writeFileSync("app/icon.svg", iconSvg());
await sharp(Buffer.from(ogImageSvg())).png({ compressionLevel: 9 }).toFile("public/og.png");
console.log("Wrote app/theme.css, app/icon.svg and public/og.png.");
