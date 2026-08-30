import { AppShell } from "@/components/shell/app-shell";
import { ConvexProviders } from "../ConvexProviders";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviders>
      <AppShell>{children}</AppShell>
    </ConvexProviders>
  );
}
