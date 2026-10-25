// Writes app/theme.css and app/icon.svg from lib/design/tokens.ts. Usage: npm run tokens
import { writeFileSync } from "node:fs";
import { iconSvg, themeCss } from "../lib/design/tokens";

writeFileSync("app/theme.css", themeCss());
writeFileSync("app/icon.svg", iconSvg());
console.log("Wrote app/theme.css and app/icon.svg.");
