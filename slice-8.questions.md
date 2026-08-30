# Slice 8 questions

- Branch name in this workspace is `slice-8-agent-chat`, not `dhruv/slice-8-landing`. Kept the workspace branch and pushed it as is.
- Root `app/layout.tsx` is not owned by this slice, so the landing page forces dark mode by wrapping itself in a `dark` div in `app/(marketing)/layout.tsx`. Metadata is set there too.
- Added devDependencies for tests: vitest, jsdom, @testing-library/react, @testing-library/jest-dom, @testing-library/dom, plus a `test` script and `vitest.config.ts`. `@vitejs/plugin-react` was skipped, its babel 8 peer set conflicts with Next 16, esbuild automatic JSX is used instead. Other slices may add the same; the seam should dedupe.
- `.env.local` with a dummy `NEXT_PUBLIC_CONVEX_URL` was created for the build and is gitignored.
- The chat mock and rule examples are static copy, no Convex calls on the landing page.
