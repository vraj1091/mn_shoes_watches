import { t } from "@/lib/i18n";

export function SkipLink() {
  return (
    <a
      href="#main"
      className="fixed top-2 left-2 z-[60] -translate-y-24 rounded-sm bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-transform focus-visible:translate-y-0"
    >
      {t("common.skipToContent")}
    </a>
  );
}
