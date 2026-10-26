import { t } from "@/lib/i18n";

/** First thing a keyboard user reaches: jumps past the header. Visually hidden until focused. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-sm bg-primary px-4 py-3 text-sm font-medium text-on-primary focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-[60]"
    >
      {t("common.skipToContent")}
    </a>
  );
}
