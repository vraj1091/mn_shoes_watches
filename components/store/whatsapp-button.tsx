import { WhatsappIcon } from "@/components/icons";
import { t } from "@/lib/i18n";

/**
 * Small floating WhatsApp link. It sits above any sticky "Add to bag" bar: pages with such a
 * bar set --sticky-cta-height on <body>, so the button never covers a buy button (Part 4).
 */
export function WhatsappButton({ number }: { number: string }) {
  const digits = number.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("footer.whatsapp")}
      className="fixed right-4 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-overlay transition-transform duration-150 hover:scale-105 bottom-[calc(1rem+env(safe-area-inset-bottom)+var(--sticky-cta-height,0px))]"
    >
      <WhatsappIcon size={26} />
    </a>
  );
}
