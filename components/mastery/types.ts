export type MasteryKind =
  | "warframe"
  | "primary"
  | "secondary"
  | "melee"
  | "companion"
  | "archwing"
  | "other";

export type MasteryRow = {
  uniqueName: string;
  name: string;
  kind: MasteryKind;
  masteryReq: number;
  masteryXp: number;
  mastered: boolean;
};

export const KIND_LABELS: Record<MasteryKind, string> = {
  warframe: "Warframe",
  primary: "Primary",
  secondary: "Secondary",
  melee: "Melee",
  companion: "Companion",
  archwing: "Archwing",
  other: "Other",
};

// DE ships every Prime with the word in its name, so the filter needs no extra field.
export function isPrime(row: { name: string }): boolean {
  return /\bprime\b/i.test(row.name);
}
