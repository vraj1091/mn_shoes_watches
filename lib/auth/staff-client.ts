import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// The two-factor step after a password sign-in is routed by StaffSignIn, which has the router.
export const staffAuthClient = createAuthClient({
  basePath: "/api/admin-auth",
  plugins: [twoFactorClient()],
});
