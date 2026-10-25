import "server-only";
import { t } from "@/lib/i18n";
import type { SearchLabels } from "./search-box";

export function searchLabels(): SearchLabels {
  return {
    label: t("header.searchLabel"),
    placeholder: t("header.searchPlaceholder"),
    submit: t("search.submit"),
    products: t("search.products"),
    categories: t("search.categories"),
    recent: t("search.recent"),
    clearRecent: t("search.clearRecent"),
    viewAll: t("search.viewAll"),
    noSuggestions: t("search.noSuggestions"),
    didYouMean: t("search.didYouMean"),
  };
}
