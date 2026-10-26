"use client";

import { PrinterIcon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClasses("primary", "sm")}>
      <PrinterIcon size={16} />
      Print or save as PDF
    </button>
  );
}
