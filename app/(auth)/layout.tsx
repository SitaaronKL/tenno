import { ConvexProviders } from "../ConvexProviders";

// Sign in keeps the landing look, always dark, whatever the app theme is.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-full flex-1 flex-col bg-background text-foreground">
      <ConvexProviders>{children}</ConvexProviders>
    </div>
  );
}
