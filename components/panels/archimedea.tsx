"use client";

import { useState } from "react";

import { Segmented } from "@/components/segmented";
import type { Archimedea } from "@/lib/contracts/worldstate";
import { AtomIcon } from "@/components/icons/atom";
import { Empty, Panel } from "./panel";
import { CheckoffRow, remaining, useCheckoffs } from "./checkoffs";
import { Countdown } from "./countdown";
import { useNow } from "./use-now";

const CLASS = "md:col-span-2 lg:col-span-3";

// Deep is the Cavia set in the Sanctum, temporal is the Hex set in Hollvania.
const VARIANTS = [
  { value: "deep", label: "Deep" },
  { value: "temporal", label: "Temporal" },
] as const;
type Variant = (typeof VARIANTS)[number]["value"];

const DIFFICULTIES = [
  { value: "normal", label: "Normal" },
  { value: "elite", label: "Elite" },
] as const;
type Difficulty = (typeof DIFFICULTIES)[number]["value"];

const TITLES: Record<Variant, string> = {
  deep: "Deep Archimedea",
  temporal: "Temporal Archimedea",
};

export function ArchimedeaPanel({ archimedea }: { archimedea: Archimedea[] }) {
  const now = useNow();
  const [variant, setVariant] = useState<Variant>("deep");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const data = archimedea.find((a) => a.variant === variant) ?? null;
  // Only a set that carries elite risks earns the second toggle.
  const elite = data?.eliteBonus?.some((bonus) => bonus !== "") ?? false;
  const hard = elite && difficulty === "elite";

  const { done } = useCheckoffs();
  const keys = data
    ? data.missions.map((m, i) => `archimedea:${variant}:${data.key}:${i}`)
    : [];
  return (
    <Panel
      title={TITLES[variant]}
      count={data ? `${keys.length - remaining(keys, done)} / ${keys.length}` : undefined}
      icon={AtomIcon}
      className={CLASS}
      action={
        <span className="flex items-center gap-3">
          {data ? <Countdown target={data.expiresAt} now={now} /> : null}
          <Segmented label="Archimedea set" options={VARIANTS} value={variant} onChange={setVariant} />
        </span>
      }
    >
      {!data ? (
        <Empty>Nothing active.</Empty>
      ) : (
        <>
          {/* The difficulty switch lives in the body so the title keeps its room. */}
          {elite ? (
            <div className="mb-2 flex justify-start">
              <Segmented
                label="Difficulty"
                options={DIFFICULTIES}
                value={difficulty}
                onChange={setDifficulty}
              />
            </div>
          ) : null}
          <ul className="divide-y divide-border">
            {data.missions.map((m, i) => {
              const bonus = hard ? (data.eliteBonus?.[i] ?? "") : "";
              const risks = [...m.risks, ...(bonus ? [bonus] : [])].join(", ");
              return (
                <CheckoffRow
                  key={`${m.missionType}:${m.deviation}`}
                  id={keys[i]}
                  expiresAt={data.expiresAt}
                  label={`${m.missionType}, ${m.deviation}`}
                >
                  <p className="truncate">
                    <span className="font-medium">{m.missionType}</span>{" "}
                    <span className="text-muted-foreground">{m.node ?? ""}</span>
                  </p>
                  <p className="truncate">{m.deviation}</p>
                  {risks ? <p className="truncate text-xs text-muted-foreground">{risks}</p> : null}
                </CheckoffRow>
              );
            })}
          </ul>
          {data.personalModifiers.length > 0 ? (
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {data.personalModifiers.join(", ")}
            </p>
          ) : null}
        </>
      )}
    </Panel>
  );
}
