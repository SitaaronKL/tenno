# shadcn/ui with Next.js App Router + Tailwind v4 (shadcn CLI 4.19.0, Aug 2026)

shadcn/ui copies component source into your repo (no runtime package). Current stack: **Tailwind CSS v4** (CSS-first config, `@theme inline`, OKLCH colors), React 19, Next 16 App Router. CLI package: `shadcn` (v4.x; `npx shadcn@latest`).

## Init
```bash
npx create-next-app@latest my-app        # Tailwind v4 + App Router + `@/*` alias are the defaults
cd my-app
npx shadcn@latest init                   # pnpm dlx shadcn@latest init | bunx --bun shadcn@latest init
# prompts: base color (Neutral | Stone | Zinc | Mauve | Olive | Mist | Taupe), css variables (yes)
# one-shot: npx shadcn@latest init -y -b neutral   ;  new project: npx shadcn@latest create --template next
```
Creates `components.json`, `lib/utils.ts` (`cn()`), and rewrites `app/globals.css` with theme tokens.

```json
// components.json (key fields)
{
  "style": "new-york", "rsc": true, "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
}
```

## Adding components
```bash
npx shadcn@latest add button card dialog form input
npx shadcn@latest add --all            # everything
npx shadcn@latest add button -o        # overwrite existing
npx shadcn@latest add button -c apps/web   # monorepo cwd
npx shadcn@latest view button          # inspect before adding
npx shadcn@latest search sidebar       # search registries
npx shadcn@latest add @acme/hero       # namespaced third-party registry
npx shadcn@latest docs button          # print docs
```
Other commands: `apply` (apply preset theme/fonts), `preset`, `list`, `info`, `build` (publish your own registry), `migrate` (icons, base colors, RTL, Radix), `eject`. Flags: `-y`, `-c/--cwd`, `--json`.

```tsx
import { Button } from "@/components/ui/button"
export default function Home() {
  return <div className="flex min-h-svh items-center justify-center"><Button>Click me</Button></div>
}
```
Components are Server-Component-safe unless they need state; interactive ones already carry `"use client"`. Compose with `cn()` from `@/lib/utils` (`clsx` + `tailwind-merge`).

## Theming (Tailwind v4 CSS variables)
`app/globals.css` (generated; edit freely):
```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  /* card, popover, secondary, accent, destructive, input, chart-1..5, sidebar-* ... */
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  /* ... */
}

@theme inline {            /* maps vars to Tailwind utilities: bg-background, text-primary-foreground, rounded-lg */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}
```
Convention: every surface token has a `-foreground` pair (`primary`/`primary-foreground`, `card`/`card-foreground`). Change brand colors by editing `--primary` etc. in both `:root` and `.dark`; add a token by defining `--brand` + `--color-brand` in `@theme inline`. Generate palettes at https://ui.shadcn.com/themes or `npx shadcn@latest apply <preset>`.

## Dark mode (next-themes)
```bash
npm install next-themes
```
```tsx
// components/theme-provider.tsx
"use client"
import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```
```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```
```tsx
// components/mode-toggle.tsx
"use client"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
export function ModeToggle() {
  const { setTheme } = useTheme()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```
`attribute="class"` toggles `.dark` on `<html>`, matching `@custom-variant dark`. `suppressHydrationWarning` is required on `<html>`.

## Gotchas
- Tailwind v4: no `tailwind.config.js`; `tailwind.config` in `components.json` is `""`. Use `@theme`/`@theme inline` in CSS. `tw-animate-css` replaced `tailwindcss-animate`.
- Forms: `add form` brings `react-hook-form` + `zod`; pair with Server Actions via `useActionState` or client-side `form.handleSubmit`.
- Icons: `lucide-react` by default (`iconLibrary`).
- Keep components in `components/ui`; re-run `add -o` to pull upstream updates (diff first with git).
- Docs: https://ui.shadcn.com/docs/installation/next , /docs/theming , /docs/dark-mode/next , /docs/cli
