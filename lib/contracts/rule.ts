import { z } from "zod";

// Shared rule schema. Used by the UI form, the AI rule builder (structured output),
// and the matcher. All three must agree, so the schema lives here and nowhere else.

export const FissureTier = z.enum(["Lith", "Meso", "Neo", "Axi", "Requiem", "Omnia"]);
export const Channel = z.enum(["email", "imessage"]);
export const DeliveryMode = z.enum(["instant", "digest"]);

export const FissureFilter = z.object({
  kind: z.literal("fissure"),
  tiers: z.array(FissureTier).nullable(),
  missionTypes: z.array(z.string()).nullable(), // "Survival", "Defense", ...
  steelPath: z.boolean().nullable(),
  storm: z.boolean().nullable(), // Void Storm (Railjack)
});

export const InvasionFilter = z.object({
  kind: z.literal("invasion"),
  rewards: z.array(z.string()).nullable(), // item names, case-insensitive contains
});

export const AlertFilter = z.object({
  kind: z.literal("alert"),
  rewards: z.array(z.string()).nullable(),
});

export const BaroFilter = z.object({
  kind: z.literal("baro"),
  items: z.array(z.string()).nullable(), // null = notify on every arrival
});

export const SortieFilter = z.object({
  kind: z.literal("sortie"),
  boss: z.array(z.string()).nullable(),
  missionTypes: z.array(z.string()).nullable(),
});

export const ArchonFilter = z.object({
  kind: z.literal("archonHunt"),
  boss: z.array(z.string()).nullable(),
});

export const CycleFilter = z.object({
  kind: z.literal("cycle"),
  world: z.enum(["cetus", "vallis", "cambion", "earth", "duviri", "zariman"]),
  state: z.string(), // "night", "day", "warm", "cold", "fass", "vome", spiral names, corpus/grineer
});

export const NightwaveFilter = z.object({ kind: z.literal("nightwave") }); // new weekly acts

export const RuleFilter = z.discriminatedUnion("kind", [
  FissureFilter,
  InvasionFilter,
  AlertFilter,
  BaroFilter,
  SortieFilter,
  ArchonFilter,
  CycleFilter,
  NightwaveFilter,
]);

export const RuleInput = z.object({
  name: z.string().min(1).max(80),
  filter: RuleFilter,
  mode: DeliveryMode,
  channels: z.array(Channel).min(1),
});

export type RuleFilter = z.infer<typeof RuleFilter>;
export type RuleInput = z.infer<typeof RuleInput>;
export type EventKind = RuleFilter["kind"];
export const EVENT_KINDS = RuleFilter.options.map((o) => o.shape.kind.value) as EventKind[];
