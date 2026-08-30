# Slice 2 questions and assumptions

Login page and authed app shell.

- **Magic link provider id.** The contract fixes Resend magic link but not the provider id used by `signIn`.
  Assumed `"resend"`, the default id of the Convex Auth Resend provider. Slice 1 owns `convex/auth.ts`, if the id
  differs, change the two `signIn("resend", ...)` calls in `app/(auth)/login/page.tsx`.
- **Auth provider missing at build time.** `ConvexAuthNextjsProvider` is slice 1 work, so `useAuthActions()` returns
  undefined during static prerender and `npm run build` crashed. Added `components/shell/auth-actions.ts`, a thin
  `useAuth()` that falls back to no ops. It stays harmless once slice 1 lands, the seam agent may inline it.
- **`convex/profiles.me` types.** `convex/_generated` does not exist yet, so `components/shell/useMe.ts` is a typed
  placeholder that returns null. Swap its body for `useQuery(api.profiles.me)` after slice 1 and slice 9 land.
  The avatar then shows the real name, email and image.
- **Redirect after sign in.** No route given, assumed `/dashboard` for both providers, and `/login` after sign out.
- **Toaster placement.** `app/layout.tsx` is not owned by this slice, so `<Toaster />` is mounted inside
  `app/(app)/layout.tsx` and inside the login page. If the seam agent moves it to the root layout, remove both.
- **Placeholder pages.** `app/(app)/dashboard|rules|chat|settings/page.tsx` did not exist, added one line pages each
  marked `// placeholder, replaced by slice N`. Slices 5, 6, 7 overwrite them.
- **New devDependencies** (logged as required): vitest, jsdom, @testing-library/react, @testing-library/dom,
  @testing-library/user-event, @testing-library/jest-dom, convex-test. Added a `test` script running `vitest run`.
  `@vitejs/plugin-react` was skipped, it conflicts with the babel version shadcn pins, esbuild handles the JSX.
  `vitest.setup.ts` polyfills `window.matchMedia` because jsdom lacks it and sonner reads it on mount.
- **Branch name.** The contract asks for `dhruv/slice-2-login-shell`, the workspace was created on
  `slice-2-schema-auth`. Kept the workspace branch so the worktree stays valid.
- **`.env.local`.** Created with a dummy `NEXT_PUBLIC_CONVEX_URL` so the build passes. It is gitignored.
