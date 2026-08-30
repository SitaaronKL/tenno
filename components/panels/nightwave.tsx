"use client";

import { useState } from "react";

import { Segmented } from "@/components/segmented";
import type { Nightwave } from "@/lib/contracts/worldstate";
import { MoonIcon } from "@/components/icons/moon";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Chip } from "./tier-badge";
import { Empty, Panel } from "./panel";
import { Countdown } from "./countdown";
import { TruncatedCell } from "@/components/ui/data-table";
import { useNow } from "./use-now";

const CADENCE = [
  { value: "all", label: "All" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
] as const;
type Cadence = (typeof CADENCE)[number]["value"];

export function NightwavePanel({ nightwave }: { nightwave: Nightwave | null }) {
  const now = useNow();
  const [cadence, setCadence] = useState<Cadence>("all");
  if (!nightwave || nightwave.acts.length === 0) {
    return (
      <Panel title="Nightwave" icon={MoonIcon} className="md:col-span-2 lg:col-span-3">
        <Empty>No acts available.</Empty>
      </Panel>
    );
  }
  const acts = nightwave.acts.filter((a) =>
    cadence === "all" ? true : cadence === "daily" ? a.daily : !a.daily,
  );
  return (
    <Panel
      // Season is part of the name, so it reads as "Season 18", not "season 18".
      title={`Nightwave, Season ${nightwave.season}`}
      icon={MoonIcon}
      count={acts.length}
      action={
        <span className="flex items-center gap-3">
          <Countdown target={nightwave.expiresAt} now={now} />
          <Segmented label="Act cadence" options={CADENCE} value={cadence} onChange={setCadence} />
        </span>
      }
      className="md:col-span-2 lg:col-span-3"
    >
      <Accordion multiple className="text-sm">
        {acts.map((a) => (
          <AccordionItem key={a.key} value={a.key}>
            <AccordionTrigger className="gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Chip>{a.daily ? "Daily" : "Weekly"}</Chip>
                <span data-primary className="min-w-0 flex-1">
                  <TruncatedCell text={a.title} />
                </span>
                <span className="ml-auto shrink-0 font-mono text-xs font-normal text-muted-foreground tabular-nums">
                  {a.reputation} rep
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {/* The countdown sits under the rep it belongs to, on the right. */}
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 text-muted-foreground">{a.description}</p>
                <Countdown target={a.expiresAt} now={now} className="shrink-0" />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Panel>
  );
}
