"use client";

import { useState, type ReactNode } from "react";
import { customerAuthClient } from "@/lib/auth/customer-client";
import { reloadTo } from "@/lib/auth/reload-to";
import { buttonClasses } from "@/components/ui/button";

export function SignOutButton({ label, icon }: { label: string; icon: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await customerAuthClient.signOut();
        reloadTo("/");
      }}
      className={buttonClasses("secondary")}
    >
      {icon}
      {label}
    </button>
  );
}
