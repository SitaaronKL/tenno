"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { LogoMark } from "@/components/shell/logo-mark";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyBuilds } from "@/components/builds/api";
import { buildColumns } from "@/components/builds/columns";
import { DraftWithAgent } from "@/components/builds/draft-dialog";

export default function BuildsPage() {
  const builds = useMyBuilds();

  return (
    <>
      <PageHeader
        title="Builds"
        helper="Your loadouts, with capacity and polarity worked out the way the game does it."
        action={
          <Button render={<Link href="/builds/new" />}>New build</Button>
        }
      />
      {builds === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-4">
          <DataTable
            label="My builds"
            columns={buildColumns}
            data={builds}
            initialSorting={[{ id: "updatedAt", desc: true }]}
            bordered
            countLabel="builds"
            empty={
              <div className="flex flex-col items-center justify-center gap-4 rounded-xl bg-card px-6 py-16 text-center ring-1 ring-foreground/10">
                <LogoMark size={32} className="opacity-40" />
                <p className="text-sm text-muted-foreground">No builds yet</p>
                <Button render={<Link href="/builds/new" />}>New build</Button>
                <DraftWithAgent />
              </div>
            }
          />
          {builds.length > 0 ? <DraftWithAgent /> : null}
        </div>
      )}
    </>
  );
}
