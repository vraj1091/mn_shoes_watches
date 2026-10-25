// Checks every text/background pair in lib/design/tokens.ts against WCAG 2.2 AA, in light and dark
// mode, and prints the failures. Exit code 1 when anything fails. Usage: npm run check:contrast
import { checkContrast } from "../lib/design/tokens";

const results = checkContrast();
const failures = results.filter((result) => !result.pass);
const verbose = process.argv.includes("--all");

for (const result of verbose ? results : failures) {
  const status = result.pass ? "ok  " : "FAIL";
  console.log(
    `${status} ${result.mode.padEnd(5)} ${result.ratio.toFixed(2).padStart(5)} : 1 (needs ${result.min})  ${result.fg} on ${result.bg}  — ${result.use}`,
  );
}

console.log(`\n${results.length - failures.length} of ${results.length} pairs pass.`);
process.exitCode = failures.length > 0 ? 1 : 0;
