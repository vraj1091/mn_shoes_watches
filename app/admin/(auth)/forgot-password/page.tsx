import type { Metadata } from "next";
import Link from "next/link";
import { requestStaffPasswordReset } from "@/lib/actions/staff-password";
import { AdminForm } from "@/components/admin/forms";
import { Field, TextInput } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Forgot your password?" };

export default function StaffForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-2 mb-8 text-sm text-muted">Enter the email you sign in to the admin with. We will email you a link to choose a new password.</p>
      <AdminForm action={requestStaffPasswordReset} submitLabel="Email me a link" primary>
        <Field label="Email">
          <TextInput name="email" type="email" autoComplete="username" required autoFocus />
        </Field>
      </AdminForm>
      <p className="mt-8 text-sm">
        <Link href="/admin/sign-in" className="inline-flex min-h-11 items-center text-link hover:text-accent underline underline-offset-4">
          Back to sign-in
        </Link>
      </p>
    </>
  );
}
