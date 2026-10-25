import { t } from "@/lib/i18n";
import { AutoThemeIcon, MoonIcon, SunIcon } from "@/components/icons";
import { ThemeChoices, ThemeMenu } from "./theme-menu";

const labels = () => ({ button: t("theme.label"), light: t("theme.light"), dark: t("theme.dark"), system: t("theme.system") });

/** The theme menu with its strings and server-rendered icons, for the store header and the admin. */
export function ThemeControl({ align }: { align?: "left" | "right" }) {
  return (
    <ThemeMenu
      align={align}
      labels={labels()}
      icons={{ light: <SunIcon size={22} />, dark: <MoonIcon size={22} />, system: <AutoThemeIcon size={22} /> }}
    />
  );
}

/** The same choice as a row of three buttons, for the phone menu drawer. */
export function ThemeControlInline() {
  return (
    <ThemeChoices labels={labels()} icons={{ light: <SunIcon size={18} />, dark: <MoonIcon size={18} />, system: <AutoThemeIcon size={18} /> }} />
  );
}
