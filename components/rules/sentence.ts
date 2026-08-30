import type { RuleFilter } from "@/lib/contracts/rule";

export const KIND_LABELS: Record<RuleFilter["kind"], string> = {
  fissure: "Fissure",
  invasion: "Invasion",
  alert: "Alert",
  baro: "Baro Ki'Teer",
  sortie: "Sortie",
  archonHunt: "Archon Hunt",
  cycle: "World cycle",
  nightwave: "Nightwave",
};

export const WORLD_LABELS: Record<string, string> = {
  cetus: "Cetus",
  vallis: "Orb Vallis",
  cambion: "Cambion Drift",
  earth: "Earth",
  duviri: "Duviri",
  zariman: "Zariman",
};

// "Axi or Meso" reads better than a comma list in the middle of a sentence.
export function joinOr(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}

const some = (v: string[] | null | undefined) => (v && v.length > 0 ? v : null);

// One sentence a player can read at a glance, used in the table and in the drafted rule.
export function ruleSentence(filter: RuleFilter): string {
  switch (filter.kind) {
    case "fissure": {
      const tiers = some(filter.tiers);
      const missions = some(filter.missionTypes);
      const parts = [tiers ? `${joinOr(tiers)} fissure` : "Any fissure"];
      if (missions) parts.push(joinOr(missions));
      if (filter.steelPath === true) parts.push("Steel Path only");
      if (filter.steelPath === false) parts.push("no Steel Path");
      if (filter.storm === true) parts.push("Void Storm only");
      return parts.join(", ");
    }
    case "invasion": {
      const rewards = some(filter.rewards);
      return rewards ? `Invasion rewarding ${joinOr(rewards)}` : "Any invasion";
    }
    case "alert": {
      const rewards = some(filter.rewards);
      return rewards ? `Alert rewarding ${joinOr(rewards)}` : "Any alert";
    }
    case "baro": {
      const items = some(filter.items);
      return items ? `Baro brings ${joinOr(items)}` : "Baro Ki'Teer arrives";
    }
    case "sortie": {
      const boss = some(filter.boss);
      const missions = some(filter.missionTypes);
      const parts = [boss ? `Sortie against ${joinOr(boss)}` : "Any sortie"];
      if (missions) parts.push(joinOr(missions));
      return parts.join(", ");
    }
    case "archonHunt": {
      const boss = some(filter.boss);
      return boss ? `Archon Hunt against ${joinOr(boss)}` : "Any Archon Hunt";
    }
    case "cycle":
      return `${WORLD_LABELS[filter.world] ?? filter.world} turns ${filter.state}`;
    case "nightwave":
      return "New Nightwave acts";
  }
}
