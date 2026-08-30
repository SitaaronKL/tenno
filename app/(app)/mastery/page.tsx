"use client";

import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMasteryProgress } from "@/components/mastery/api";
import { MasteryTable } from "@/components/mastery/mastery-table";
import { PlayerIdCard } from "@/components/mastery/player-id-card";
import { SummaryTiles } from "@/components/mastery/summary-tiles";

export default function MasteryPage() {
  // The player id lives on the profile, so mastery is scoped to whoever is signed in.
  const progress = useMasteryProgress();

  return (
    <>
      <PageHeader
        title="Mastery"
        helper="Every item that gives mastery, checked against your profile."
      />
      {progress === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-6">
          <PlayerIdCard playerId={progress.playerId} />
          <SummaryTiles progress={progress} />
          <MasteryTable rows={progress.rows} hasRoster={progress.total > 0} />
        </div>
      )}
    </>
  );
}
