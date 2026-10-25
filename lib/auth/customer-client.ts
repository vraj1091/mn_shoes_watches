import { createAuthClient } from "better-auth/react";
import { emailOTPClient, phoneNumberClient } from "better-auth/client/plugins";

export const customerAuthClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [emailOTPClient(), phoneNumberClient()],
});
