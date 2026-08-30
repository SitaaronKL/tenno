import { HiddenProvider } from "@/components/hidden";
import { CycleTilesLive } from "@/components/panels/cycles";
import { DashboardGrid } from "@/components/panels/dashboard-grid";
import { PageHeader } from "@/components/shell/page-header";

// Convex data is live per request, never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "World state" };

export default function DashboardPage() {
  // One reader for the whole page, so the tiles and the grid agree on what is hidden.
  return (
    <HiddenProvider>
      <PageHeader
        title="World state"
        helper={"Live from the PC world state,\nrefreshed every five minutes."}
        action={<CycleTilesLive />}
      />
      <DashboardGrid />
    </HiddenProvider>
  );
}
