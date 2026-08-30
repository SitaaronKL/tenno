import { DashboardGrid } from "@/components/panels/dashboard-grid";

// Convex data is live per request, never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-4">
      <h1 className="mb-3 text-lg font-semibold">World state</h1>
      <DashboardGrid />
    </main>
  );
}
