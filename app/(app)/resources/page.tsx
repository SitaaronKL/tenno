"use client";

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/page-header";
import { LogoMark } from "@/components/shell/logo-mark";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientOnly } from "@/components/rules/client-only";
import { useWorldState } from "@/components/panels/world-state";
import { AddGoal } from "@/components/resources/add-goal";
import { GoalsTable, type GoalRow } from "@/components/resources/goals-table";
import {
  useAddFromItem,
  useAddGoal,
  useGoals,
  useItemNames,
  useRemoveGoal,
  useSetHave,
} from "@/components/resources/api";
import { liveDrops } from "@/convex/lib/resources";
import { errorMessage } from "@/lib/errors";

function ResourcesBody() {
  const goals = useGoals();
  const names = useItemNames();
  const state = useWorldState();
  const add = useAddGoal();
  const addRecipe = useAddFromItem();
  const setHave = useSetHave();
  const removeGoal = useRemoveGoal();

  // World state moves every five minutes, so the badge is computed here rather than stored.
  const rows: GoalRow[] | undefined = useMemo(
    () =>
      goals?.map((goal) => ({
        ...goal,
        live: liveDrops(state ?? null, goal.itemName, goal.sources),
      })),
    [goals, state],
  );

  const onSetHave = useCallback(
    (row: GoalRow, haveCount: number) => {
      void setHave({ id: row._id, haveCount }).catch((caught) =>
        toast.error(errorMessage(caught, "Could not save that count, try again.")),
      );
    },
    [setHave],
  );

  const onRemove = useCallback(
    (row: GoalRow) => {
      void removeGoal({ id: row._id }).catch((caught) =>
        toast.error(errorMessage(caught, "Could not drop that goal, try again.")),
      );
    },
    [removeGoal],
  );

  if (rows === undefined || names === undefined) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <AddGoal
        names={names}
        onAdd={(itemName, wantedCount) => add({ itemName, wantedCount })}
        onAddRecipe={(uniqueName) => addRecipe({ uniqueName })}
      />
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-card px-6 py-16 text-center ring-1 ring-foreground/10">
          <LogoMark size={32} className="opacity-40" />
          <p className="text-sm text-muted-foreground">
            Nothing tracked yet. Search an item above, or add a whole recipe at once.
          </p>
        </div>
      ) : (
        <GoalsTable rows={rows} onSetHave={onSetHave} onRemove={onRemove} />
      )}
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <>
      <PageHeader
        title="Resources"
        helper="What you are farming, where it drops, and what is offering it right now."
      />
      <ClientOnly fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <ResourcesBody />
      </ClientOnly>
    </>
  );
}
