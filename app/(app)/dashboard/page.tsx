import { DashboardGrid } from "@/components/panels/dashboard-grid";
import { PageHeader } from "@/components/shell/page-header";

// Convex data is live per request, never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="World state" helper="Live from the PC world state, refreshed every five minutes." />
      <DashboardGrid />
    </>
  );
}
