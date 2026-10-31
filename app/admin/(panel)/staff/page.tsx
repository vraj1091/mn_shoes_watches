import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { prisma, DEFAULT_STORE_ID } from "@/lib/db/client";
import { ROLE_LABELS, ROLE_SUMMARIES, STAFF_ROLES, isStaffRole, requiresTwoFactor } from "@/lib/auth/permissions";
import { changeStaffRole, inviteStaff, resetStaffTwoFactor, sendPasswordLink, setStaffActive } from "@/lib/actions/admin/staff";
import { formatDateTime } from "@/lib/format/date";
import { AdminPage } from "@/components/admin/admin-frame";
import { AdminForm } from "@/components/admin/forms";
import { StaffControls } from "@/components/admin/staff-controls";
import { Card, Field, Select, StatusBadge, Table, TextInput, td, th } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Staff" };

const ROLE_OPTIONS = STAFF_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

export default async function StaffPage() {
  const { user } = await requireStaff("staff.manage");
  const staff = await prisma.staffUser.findMany({
    where: { storeId: DEFAULT_STORE_ID },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      twoFactorEnabled: true,
      lastLoginAt: true,
      accounts: { where: { providerId: "credential", password: { not: null } }, select: { id: true } },
    },
  });

  return (
    <AdminPage title="Staff" intro="Who can open this admin and what each person may do. Only owners see this page." wide>
      <Table caption="Staff accounts">
        <thead>
          <tr>
            <th className={th}>Person</th>
            <th className={th}>Role</th>
            <th className={th}>Status</th>
            <th className={th}>Last sign-in</th>
            <th className={th}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {staff.map((person) => {
            const role = isStaffRole(person.role) ? person.role : "STAFF";
            const pending = person.accounts.length === 0;
            const self = person.id === user.id;
            return (
              <tr key={person.id} className={person.isActive ? "" : "text-muted"}>
                <td className={td}>
                  <p className="font-medium">
                    {person.name}
                    {self && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
                  </p>
                  <p className="text-xs text-muted">{person.email}</p>
                </td>
                <td className={td}>{ROLE_LABELS[role]}</td>
                <td className={td}>
                  <span className="flex flex-wrap gap-1.5">
                    {!person.isActive ? (
                      <StatusBadge tone="bad">Switched off</StatusBadge>
                    ) : pending ? (
                      <StatusBadge tone="warning">Invite not accepted</StatusBadge>
                    ) : (
                      <StatusBadge tone="good">Active</StatusBadge>
                    )}
                    {person.twoFactorEnabled ? (
                      <StatusBadge tone="info">Two-step on</StatusBadge>
                    ) : (
                      requiresTwoFactor(role) && !pending && person.isActive && <StatusBadge tone="neutral">Two-step needed</StatusBadge>
                    )}
                  </span>
                </td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{person.lastLoginAt ? formatDateTime(person.lastLoginAt) : "Never"}</td>
                <td className={td}>
                  {self ? (
                    <span className="text-xs text-muted">Change your password and two-step sign-in on My account.</span>
                  ) : (
                    <StaffControls
                      name={person.name}
                      role={role}
                      roles={ROLE_OPTIONS}
                      active={person.isActive}
                      invitePending={pending}
                      twoFactor={person.twoFactorEnabled}
                      changeRole={changeStaffRole.bind(null, person.id)}
                      setActive={setStaffActive.bind(null, person.id)}
                      sendLink={sendPasswordLink.bind(null, person.id)}
                      resetTwoFactor={resetStaffTwoFactor.bind(null, person.id)}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Invite someone">
          <AdminForm action={inviteStaff} submitLabel="Send invite" primary>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <TextInput name="name" required autoComplete="off" />
              </Field>
              <Field label="Email">
                <TextInput name="email" type="email" required autoComplete="off" />
              </Field>
              <Field label="Role" className="sm:col-span-2">
                <Select name="role" defaultValue="STAFF">
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="mt-3 text-sm text-muted">They get an email with a link to choose their own password. The link works for 3 days.</p>
          </AdminForm>
        </Card>
        <Card title="What each role can do">
          <dl className="space-y-3 text-sm">
            {STAFF_ROLES.map((role) => (
              <div key={role}>
                <dt className="font-semibold">{ROLE_LABELS[role]}</dt>
                <dd className="text-muted">{ROLE_SUMMARIES[role]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </AdminPage>
  );
}
