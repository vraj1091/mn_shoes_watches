"use client";

import { staffAuthClient } from "@/lib/auth/staff-client";
import { reloadTo } from "@/lib/auth/reload-to";

export function StaffSignOutButton() {
  return (
    <button
      type="button"
      onClick={async () => {
        await staffAuthClient.signOut();
        reloadTo("/admin/sign-in");
      }}
      className="min-h-11 rounded-sm px-2 text-sm text-muted hover:bg-surface hover:text-ink"
    >
      Sign out
    </button>
  );
}
