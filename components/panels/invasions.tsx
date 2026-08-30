"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { Invasion, Reward } from "@/lib/contracts/worldstate";
import { SortableHeader, TruncatedCell, type DataTableFeatures } from "@/components/ui/data-table";

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
  helper.accessor("node", {
    id: "node",
    header: ({ column }) => <SortableHeader column={column}>Node</SortableHeader>,
    cell: ({ row }) => <TruncatedCell text={row.original.node} className="font-medium" />,
  }),
  helper.accessor((i) => invasionRewards(i), {
    id: "rewards",
    header: ({ column }) => <SortableHeader column={column}>Rewards</SortableHeader>,
    cell: ({ row }) => (
      <TruncatedCell text={invasionRewards(row.original)} className="text-muted-foreground" />
    ),
  }),
]);
export const invasionWidths = { node: "w-40" };
