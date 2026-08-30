"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ClientOnly } from "@/components/rules/client-only";
import { Skeleton } from "@/components/ui/skeleton";
import { useMasteryProgress } from "@/components/mastery/api";
import { MasteryTable } from "@/components/mastery/mastery-table";
import { PlayerIdCard } from "@/components/mastery/player-id-card";
import { SummaryTiles } from "@/components/mastery/summary-tiles";

const STORAGE_KEY = "voidwatch.playerId";

function MasteryBody() {
  // The id is not a secret and it is a pain to retype, so keep it on the device.
  // ClientOnly guarantees this body only renders in the browser.
  const [playerId, setPlayerId] = useState<string | null>(() =>
    window.localStorage.getItem(STORAGE_KEY),
  );
  const progress = useMasteryProgress(playerId);

  function save(id: string) {
    window.localStorage.setItem(STORAGE_KEY, id);
    setPlayerId(id);
  }

  return (
    <div className="space-y-6">
      <PlayerIdCard playerId={playerId} onSaved={save} />
      {progress === undefined ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <SummaryTiles progress={progress} />
          <MasteryTable rows={progress.rows} />
        </>
      )}
    </div>
  );
}

export default function MasteryPage() {
  return (
    <>
      <PageHeader
        title="Mastery"
        helper="Every item that gives mastery, checked against your profile."
      />
      <ClientOnly fallback={<Skeleton className="h-96 w-full" />}>
        <MasteryBody />
      </ClientOnly>
    </>
  );
}
