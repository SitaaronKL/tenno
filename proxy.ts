import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignInPage = createRouteMatcher(["/login"]);
// /dashboard is deliberately absent: world state is public game data, the same for everyone,
// and worldstate.get is already the one unauthenticated query.
const isProtectedRoute = createRouteMatcher([
  "/rules(.*)",
  "/chat(.*)",
  "/mastery(.*)",
  "/settings(.*)",
]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isSignInPage(request) && (await convexAuth.isAuthenticated())) {
      return nextjsMiddlewareRedirect(request, "/dashboard");
    }
    if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
      // The login page names the page they were reaching for, rather than bouncing them silently.
      const next = request.nextUrl.pathname;
      return nextjsMiddlewareRedirect(request, `/login?next=${encodeURIComponent(next)}`);
    }
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 30 } },
);

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
