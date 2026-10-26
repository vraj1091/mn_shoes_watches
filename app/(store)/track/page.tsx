import type { Metadata } from "next";
import en from "@/messages/en.json";
import { t } from "@/lib/i18n";
import { TrackForm, type TrackLabels } from "@/components/store/shop/track-form";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: t("track.title"), description: t("track.intro"), alternates: { canonical: "/track" } };

export default async function TrackPage({ searchParams }: Props) {
  const order = (await searchParams).order;
  const keys = ["orderNumber", "orderNumberHint", "phone", "submit", "invalid", "notFound", "busy", "status", "placed", "expected", "courier", "timeline", "viewOrder"] as const;
  const text = Object.fromEntries(keys.map((key) => [key, t(`track.${key}`)])) as Omit<TrackLabels, "statuses">;
  const labels: TrackLabels = { ...text, statuses: en.order.status };
  return (
    <div className="mx-auto max-w-3xl px-4 pt-10 pb-4 sm:px-6">
      <h1 className="font-display text-4xl lg:text-5xl">{t("track.title")}</h1>
      <p className="mt-3 text-base text-muted">{t("track.intro")}</p>
      <TrackForm labels={labels} initialOrder={typeof order === "string" ? order.slice(0, 12) : ""} />
    </div>
  );
}
