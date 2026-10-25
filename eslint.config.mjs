import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["lib/generated/**", ".next/**", "data/**", "playwright-report/**", ".lighthouseci/**"],
  },
];

export default config;
