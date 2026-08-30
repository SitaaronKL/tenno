"use client";

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

export function NightwavePanel({ nightwave }: { nightwave: Nightwave | null }) {
  const now = useNow();
  if (!nightwave || nightwave.acts.length === 0) {
    return (
      <Panel title="Nightwave" icon={MoonIcon} className="md:col-span-2 lg:col-span-6">
        <Empty>No acts available.</Empty>
      </Panel>
    );
  }
  return (
    <Panel
      // Season is part of the name, so it reads as "Season 18", not "season 18".
      title={`Nightwave, Season ${nightwave.season}`}
      icon={MoonIcon}
      count={nightwave.acts.length}
      action={<Countdown target={nightwave.expiresAt} now={now} />}
      className="md:col-span-2 lg:col-span-6"
    >
      <Accordion multiple className="text-sm">
        {nightwave.acts.map((a) => (
          <AccordionItem key={a.key} value={a.key}>
            <AccordionTrigger className="gap-2">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                <Chip>{a.daily ? "Daily" : "Weekly"}</Chip>
                <TruncatedCell text={a.title} className="min-w-0 flex-1" />
                <span className="ml-auto shrink-0 font-mono text-xs font-normal text-muted-foreground tabular-nums">
                  {a.reputation} rep
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{a.description}</p>
              <p className="mt-2">
                <Countdown target={a.expiresAt} now={now} />
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Panel>
  );
}
