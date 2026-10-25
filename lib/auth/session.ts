import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCustomerAuth } from "./customer";
import { getStaffAuth } from "./staff";
import { can, isStaffRole, requiresTwoFactor, type Permission, type StaffRoleName } from "./permissions";

/*
 * The data access layer for "who is this?". Every server component, action and route that cares
 * about the visitor goes through these functions; none reads auth cookies on its own.
 * Session reads happen at request time, so callers render inside a <Suspense> boundary.
 */

// Read the request first: that is what defers the work to request time during `next build`,
// before the auth instance (which needs the secrets) is created.
export async function getCustomerSession() {
  const requestHeaders = await headers();
  return getCustomerAuth().api.getSession({ headers: requestHeaders });
}

export type StaffSession = {
  user: { id: string; name: string; email: string; role: StaffRoleName; twoFactorEnabled: boolean };
};

export async function getStaffSession(): Promise<StaffSession | null> {
  const requestHeaders = await headers();
  const session = await getStaffAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const { id, name, email, role, isActive, twoFactorEnabled } = session.user;
  if (!isActive || !isStaffRole(role)) return null;
  return { user: { id, name, email, role, twoFactorEnabled: Boolean(twoFactorEnabled) } };
}

/**
 * Gate for every admin page and server action. Signed-out staff go to sign-in; Owner and
 * Manager are held on the security page until two-factor is on; a missing permission sends
 * the person back to the dashboard with an explanation.
 */
export async function requireStaff(
  permission?: Permission,
  options: { allowWithoutTwoFactor?: boolean } = {},
): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/sign-in");
  const { role, twoFactorEnabled } = session.user;
  if (!options.allowWithoutTwoFactor && requiresTwoFactor(role) && !twoFactorEnabled) {
    redirect("/admin/account?setup=two-factor");
  }
  if (permission && !can(role, permission)) redirect(`/admin?denied=${encodeURIComponent(permission)}`);
  return session;
}
