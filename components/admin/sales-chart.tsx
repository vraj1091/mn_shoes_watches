"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format/money";

export type ChartDay = { key: string; label: string; total: number; orders: number };

const WIDTH = 720;
const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 64 };

/** A round axis maximum (₹1k, 2k, 5k, 10k …) a little above the largest day. */
function niceMax(value: number): number {
  if (value <= 0) return 1_000_00;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((multiple) => multiple * exponent >= value)!;
  return step * exponent;
}

const short = (paise: number) => {
  const rupees = paise / 100;
  if (rupees >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(rupees % 1_00_000 ? 1 : 0)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(rupees % 1_000 ? 1 : 0)}k`;
  return `₹${rupees}`;
};

/**
 * Daily sales for the last 30 days: one series, so no legend; the title names it. Bars in the
 * primary colour with rounded tops, a 2 px gap, a hover and focus tooltip, and the same numbers
 * as a table for screen readers and anyone who prefers figures.
 */
export function SalesChart({ days, title }: { days: ChartDay[]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...days.map((day) => day.total)));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const slot = plotWidth / days.length;
  const barWidth = Math.max(4, slot - 2);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * max);
  const shown = active !== null ? days[active]! : null;

  return (
    <figure>
      <figcaption className="text-base font-semibold">{title}</figcaption>
      <div className="relative mt-4">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={title}>
          {ticks.map((tick) => {
            const y = PAD.top + plotHeight - (tick / max) * plotHeight;
            return (
              <g key={tick}>
                <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} className="stroke-line" strokeWidth={1} />
                <text x={PAD.left - 8} y={y + 4} textAnchor="end" className="fill-muted text-[11px]">
                  {short(tick)}
                </text>
              </g>
            );
          })}
          {days.map((day, index) => {
            const height = (day.total / max) * plotHeight;
            const x = PAD.left + index * slot + (slot - barWidth) / 2;
            const y = PAD.top + plotHeight - height;
            const radius = Math.min(4, barWidth / 2, height);
            return (
              <g
                key={day.key}
                tabIndex={0}
                role="img"
                aria-label={`${day.label}: ${formatPrice(day.total)}, ${day.orders} orders`}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none"
              >
                {/* Hit area taller and wider than the bar. */}
                <rect x={PAD.left + index * slot} y={PAD.top} width={slot} height={plotHeight} fill="transparent" />
                {height > 0 && (
                  // Rounded top corners, flat base on the axis.
                  <path
                    d={`M${x},${y + height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + barWidth - radius} Q${x + barWidth},${y} ${x + barWidth},${y + radius} V${y + height} Z`}
                    className={active === index ? "fill-primary-hover" : "fill-primary"}
                  />
                )}
                {(index % 5 === 0 || index === days.length - 1) && (
                  <text x={PAD.left + index * slot + slot / 2} y={HEIGHT - 8} textAnchor="middle" className="fill-muted text-[11px]">
                    {day.label}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={PAD.left} x2={WIDTH - PAD.right} y1={PAD.top + plotHeight} y2={PAD.top + plotHeight} className="stroke-line-strong" strokeWidth={1} />
        </svg>
        {shown && active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-sm border border-line bg-raised px-3 py-2 text-xs shadow-overlay"
            style={{ left: `${((PAD.left + active * slot + slot / 2) / WIDTH) * 100}%` }}
          >
            <p className="font-semibold">{shown.label}</p>
            <p className="price">{formatPrice(shown.total)}</p>
            <p className="text-muted">
              {shown.orders} {shown.orders === 1 ? "order" : "orders"}
            </p>
          </div>
        )}
      </div>
      <details className="mt-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 text-link">Show as a table</summary>
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-1 font-semibold">Day</th>
                <th className="py-1 text-right font-semibold">Orders</th>
                <th className="py-1 text-right font-semibold">Sales</th>
              </tr>
            </thead>
            <tbody className="price">
              {days.map((day) => (
                <tr key={day.key} className="border-t border-line">
                  <td className="py-1">{day.label}</td>
                  <td className="py-1 text-right">{day.orders}</td>
                  <td className="py-1 text-right">{formatPrice(day.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
