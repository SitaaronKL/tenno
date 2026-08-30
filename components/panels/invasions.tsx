"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { Invasion, Reward } from "@/lib/contracts/worldstate";
import { SortableHeader, TruncatedCell, type DataTableFeatures } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { Checkoff, INVASION_LIFE, doneRow, invasionKey, useCheckoffs } from "./checkoffs";

// An invasion row is a task like a sortie stage, so it carries the same box in its first column.
function InvasionCheckoff({ invasion }: { invasion: Invasion }) {
  return (
    <Checkoff
      id={invasionKey(invasion.key)}
      expiresAt={invasion.startsAt + INVASION_LIFE}
      label={invasion.node}
    />
  );
}

// Struck through text has to be read off the row's own cells, the table draws no row wrapper.
function useInvasionDone(invasion: Invasion): boolean {
  return useCheckoffs().done.has(invasionKey(invasion.key));
}

function NodeCell({ invasion }: { invasion: Invasion }) {
  return (
    <TruncatedCell
      text={invasion.node}
      className={cn("font-medium", useInvasionDone(invasion) && doneRow)}
    />
  );
}

function RewardsCell({ invasion }: { invasion: Invasion }) {
  return (
    <TruncatedCell
      text={invasionRewards(invasion)}
      className={cn("text-muted-foreground", useInvasionDone(invasion) && doneRow)}
    />
  );
}

export function rewardText(r: Reward | null): string {
  if (!r) return "No reward";
  if (r.item) return r.count > 1 ? `${r.item} x${r.count}` : r.item;
  return `${r.credits.toLocaleString()} credits`;
}


// Rewards are the only thing people read off an invasion. A side without a reward is the
// Infested side of a one sided fight, so the row says who you fight instead.
export function invasionRewards(i: Invasion): string {
  const a = i.attacker.reward ? rewardText(i.attacker.reward) : null;
  const d = i.defender.reward ? rewardText(i.defender.reward) : null;
  if (a && d) return `${a} / ${d}`;
  return `${a ?? d ?? "No reward"} · vs ${a ? i.defender.faction : i.attacker.faction}`;
}

const helper = createColumnHelper<DataTableFeatures, Invasion>();
export const invasionColumns = helper.columns([
  helper.display({
    id: "done",
    header: () => <span className="sr-only">Done</span>,
    cell: ({ row }) => <InvasionCheckoff invasion={row.original} />,
  }),
  helper.accessor("node", {
    id: "node",
    header: ({ column }) => <SortableHeader column={column}>Node</SortableHeader>,
    cell: ({ row }) => <NodeCell invasion={row.original} />,
  }),
  helper.accessor((i) => invasionRewards(i), {
    id: "rewards",
    header: ({ column }) => <SortableHeader column={column}>Rewards</SortableHeader>,
    cell: ({ row }) => <RewardsCell invasion={row.original} />,
  }),
]);
export const invasionWidths = { done: "w-8", node: "w-40" };
