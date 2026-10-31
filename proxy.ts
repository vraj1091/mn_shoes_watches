import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { decideRoute, getRouteRegistry } from "@/lib/routing/registry";
import { notFoundHtml } from "@/lib/routing/not-found-html";

/*
 * Runs before any page renders, so it can still answer with a real HTTP status (pages stream,
 * and once streaming starts the status is fixed at 200):
 * - signed-out visitors to /admin and /account go to the sign-in page (an optimistic cookie
 *   check; every page still verifies the session itself);
 * - unknown categories, products and files get a real 404, archived products a 301 to their replacement.
 */

const ADMIN_PUBLIC = new Set(["/admin/sign-in", "/admin/two-factor", "/admin/forgot-password", "/admin/set-password"]);
const ACCOUNT_PUBLIC = new Set(["/account/sign-in", "/account/sign-up", "/account/forgot-password"]);

// The same headers next.config.ts adds to pages; this response does not pass through Next's router.
const NOT_FOUND_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
};

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (!ADMIN_PUBLIC.has(pathname) && !getSessionCookie(request, { cookiePrefix: "mn-admin" })) {
      return NextResponse.redirect(new URL("/admin/sign-in", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account") && !ACCOUNT_PUBLIC.has(pathname)) {
    if (!getSessionCookie(request, { cookiePrefix: "mn" })) {
      const signIn = new URL("/account/sign-in", request.url);
      signIn.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  const routes = getRouteRegistry();
  if (!routes) return NextResponse.next();
  const decision = decideRoute(pathname, routes);
  if (decision.action === "redirect") return NextResponse.redirect(new URL(decision.location, request.url), 301);
  if (decision.action === "not-found") {
    // A rewrite to a page cannot carry a 404 status, so the proxy answers with the 404 page itself.
    return new NextResponse(request.method === "HEAD" ? null : notFoundHtml(routes.notFound), { status: 404, headers: NOT_FOUND_HEADERS });
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next.js assets, API routes, uploaded media and the demo photos in public/demo,
  // which answer their own 404s.
  matcher: ["/((?!_next/|api/|media/|demo/).*)"],
};
