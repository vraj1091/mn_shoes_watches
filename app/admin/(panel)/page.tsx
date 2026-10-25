import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSetupChecklist } from "@/lib/setup-checklist";
import { CheckIcon, InfoIcon } from "@/components/icons";
import { AdminPage } from "@/components/admin/admin-frame";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminDashboard({ searchParams }: Props) {
  const { user } = await requireStaff("dashboard.view");
  const { denied } = await searchParams;
  const checklist = await getSetupChecklist(user);
  const remaining = checklist.filter((item) => !item.done).length;
  const deniedPermission = typeof denied === "string" && (PERMISSIONS as readonly string[]).includes(denied);

  return (
    <AdminPage title={`Hello, ${user.name.split(" ")[0]}`}>
      {deniedPermission && (
        <div className="mb-8">
          <FormAlert tone="info">Your role does not include that page. Ask the shop owner if you need it.</FormAlert>
        </div>
      )}

      <section aria-labelledby="setup-heading" className="rounded-md border border-line">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
          <h2 id="setup-heading" className="text-lg font-semibold">
            Before you take real orders
          </h2>
          <p className="text-sm text-muted tabular-nums">
            {remaining === 0 ? "All done" : `${checklist.length - remaining} of ${checklist.length} done`}
          </p>
        </div>
        <ul>
          {checklist.map((item) => (
            <li key={item.id} className="flex gap-4 border-b border-line px-5 py-4 last:border-b-0">
              {item.done ? (
                <CheckIcon size={22} className="mt-0.5 shrink-0 text-stock" label="Done" />
              ) : (
                <InfoIcon size={22} className="mt-0.5 shrink-0 text-link" label="To do" />
              )}
              <div>
                <p className={`text-base font-medium ${item.done ? "text-muted line-through decoration-1" : ""}`}>{item.label}</p>
                {!item.done && <p className="mt-0.5 text-sm text-muted">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminPage>
  );
}
