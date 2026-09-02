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
  bounty: "Bounty",
  archimedea: "Archimedea",
  arbitration: "Arbitration",
  reset: "Reset",
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
      const modifiers = some(filter.modifiers);
      const parts = [boss ? `Sortie against ${joinOr(boss)}` : "Any sortie"];
      if (missions) parts.push(joinOr(missions));
      if (modifiers) parts.push(joinOr(modifiers));
      return parts.join(", ");
    }
    case "archonHunt": {
      const boss = some(filter.boss);
      return boss ? `Archon Hunt against ${joinOr(boss)}` : "Any Archon Hunt";
    }
    case "cycle": {
      const turns = `${WORLD_LABELS[filter.world] ?? filter.world} turns ${filter.state}`;
      const lead = filter.leadMinutes ?? null;
      if (lead === null) return turns;
      return `${lead} ${lead === 1 ? "minute" : "minutes"} before ${turns}`;
    }
    case "nightwave":
      return "New Nightwave acts";
    case "bounty": {
      const syndicates = some(filter.syndicates);
      const missions = some(filter.missionTypes);
      const board =
        filter.level === null
          ? "Any bounty"
          : filter.level === "top"
            ? "Top tier bounty"
            : `Tier ${filter.level} bounty`;
      const parts = [syndicates ? `${board} from ${joinOr(syndicates)}` : board];
      if (missions) parts.push(joinOr(missions));
      return parts.join(", ");
    }
    case "archimedea": {
      const deviations = some(filter.deviations);
      const risks = some(filter.risks);
      const set =
        filter.variant === null
          ? "Any Archimedea"
          : `${filter.variant === "deep" ? "Deep" : "Temporal"} Archimedea`;
      const parts = [set];
      if (deviations) parts.push(`deviation ${joinOr(deviations)}`);
      if (risks) parts.push(`risk ${joinOr(risks)}`);
      return parts.join(", ");
    }
    case "arbitration": {
      const missions = some(filter.missionTypes);
      const tiers = some(filter.tiers);
      const parts = [missions ? `Arbitration is ${joinOr(missions)}` : "Any arbitration"];
      if (tiers) parts.push(`tier ${joinOr(tiers)}`);
      return parts.join(", ");
    }
    case "reset":
      return filter.period === "daily" ? "Daily reset" : "Weekly reset";
  }
}
