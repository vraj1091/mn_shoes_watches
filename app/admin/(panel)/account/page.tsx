import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { requiresTwoFactor, ROLE_LABELS } from "@/lib/auth/permissions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { CheckIcon } from "@/components/icons";
import { AdminPage } from "@/components/admin/admin-frame";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { TwoFactorSetup } from "@/components/admin/two-factor-setup";
import { FormAlert } from "@/components/ui/field";

export const metadata: Metadata = { title: "My account" };

const section = "border-t border-line py-8";

export default async function AdminAccountPage() {
  const { user } = await requireStaff(undefined, { allowWithoutTwoFactor: true });
  const mustSetUp = requiresTwoFactor(user.role) && !user.twoFactorEnabled;

  return (
    <AdminPage title="My account" intro={`${user.name} · ${user.email} · ${ROLE_LABELS[user.role]}`}>
      {mustSetUp && (
        <div className="mb-8">
          <FormAlert tone="info">
            As {ROLE_LABELS[user.role]}, you can refund payments and change settings, so the admin asks for a code from your
            phone as well as your password. Set it up below to continue. It takes about two minutes.
          </FormAlert>
        </div>
      )}

      <section aria-labelledby="tf-heading" className={section}>
        <h2 id="tf-heading" className="text-xl font-semibold">
          Two-factor sign-in
        </h2>
        <div className="mt-4">
          {user.twoFactorEnabled ? (
            <p className="flex items-center gap-2 text-base">
              <CheckIcon size={20} className="text-stock" />
              On. Each sign-in asks for a code from your authenticator app.
            </p>
          ) : (
            <TwoFactorSetup />
          )}
        </div>
      </section>

      <section aria-labelledby="pw-heading" className={section}>
        <h2 id="pw-heading" className="mb-4 text-xl font-semibold">
          Password
        </h2>
        <ChangePasswordForm minLength={MIN_PASSWORD_LENGTH} />
      </section>
    </AdminPage>
  );
}
