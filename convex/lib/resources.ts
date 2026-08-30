import type { RuleInput } from "../../lib/contracts/rule";
import type { WorldState } from "../../lib/contracts/worldstate";

// Pure resource tracker logic, shared by convex/goals.ts and the /resources page. No ctx here.

export interface DropSource {
  place: string;
  rotation: string;
  chance: number;
}

export interface Component {
  itemType: string;
  count: number;
}

export interface Part {
  uniqueName: string;
  name: string;
  components: Component[];
}

export interface GoalLine {
  itemName: string;
  count: number;
}

export type LiveKind = "fissure" | "invasion" | "alert" | "bounty";

export interface LiveDrop {
  kind: LiveKind;
  label: string;
}

export function topSources(sources: DropSource[], limit = 3): DropSource[] {
  return [...sources].sort((a, b) => b.chance - a.chance).slice(0, limit);
}

// The drop tables print a count and the word Blueprint into the name, our data names the thing.
export function sourceNames(itemName: string): string[] {
  const bare = itemName.replace(/^\d[\d,]*\s*[xX]\s*/, "").trim();
  return [...new Set([itemName, bare, `${bare} Blueprint`])];
}

function sameItem(a: string, b: string): boolean {
  const names = sourceNames(a).map((name) => name.toLowerCase());
  return sourceNames(b).some((name) => names.includes(name.toLowerCase()));
}

const RELIC_PLACE = /^(Lith|Meso|Neo|Axi|Requiem|Omnia) \S+ relic$/;

// Which live pieces of world state hand out this item right now. Fissures carry no reward list, so
// they count when the item comes out of a relic of the tier that is open.
export function liveDrops(
  state: WorldState | null | undefined,
  itemName: string,
  sources: DropSource[],
): LiveDrop[] {
  if (!state) return [];
  const drops: LiveDrop[] = [];

  for (const invasion of state.invasions) {
    const rewards = [invasion.attacker.reward, invasion.defender.reward];
    if (rewards.some((reward) => reward && sameItem(reward.item, itemName))) {
      drops.push({ kind: "invasion", label: `Invasion, ${invasion.node}` });
    }
  }
  for (const alert of state.alerts) {
    if (alert.rewards.some((reward) => sameItem(reward.item, itemName))) {
      drops.push({ kind: "alert", label: `Alert, ${alert.node}` });
    }
  }
  for (const board of state.bounties ?? []) {
    const offers = board.jobs.some(
      (job) =>
        job.rewards.some((reward) => sameItem(reward, itemName)) ||
        (job.rewardTable ?? []).some((rotation) =>
          rotation.rewards.some((reward) => sameItem(reward.item, itemName)),
        ),
    );
    if (offers) drops.push({ kind: "bounty", label: `${board.syndicate} bounty, ${board.node}` });
  }

  const tiers = new Set(
    sources
      .map((source) => RELIC_PLACE.exec(source.place)?.[1])
      .filter((tier): tier is string => Boolean(tier)),
  );
  for (const fissure of state.fissures) {
    if (tiers.has(fissure.tier)) {
      drops.push({ kind: "fissure", label: `${fissure.tier} fissure, ${fissure.node}` });
    }
  }
  return drops;
}

// A rule prefilled from a goal. Only the kinds that filter on a reward can name the item, a fissure
// rule has nowhere to put it, so that row offers no rule rather than a rule that watches everything.
export function farmRule(itemName: string, live: LiveDrop[]): RuleInput | null {
  const invasion = live.find((drop) => drop.kind === "invasion");
  if (invasion) {
    return {
      name: `${itemName} from an invasion`,
      filter: { kind: "invasion", rewards: [itemName] },
      mode: "instant",
      channels: ["email"],
    };
  }
  const alert = live.find((drop) => drop.kind === "alert");
  if (alert) {
    return {
      name: `${itemName} from an alert`,
      filter: { kind: "alert", rewards: [itemName] },
      mode: "instant",
      channels: ["email"],
    };
  }
  const bounty = live.find((drop) => drop.kind === "bounty");
  if (bounty) {
    const syndicate = bounty.label.replace(/ bounty,.*$/, "");
    return {
      name: `${itemName} on the ${syndicate} board`,
      filter: { kind: "bounty", syndicates: [syndicate], level: null, missionTypes: null },
      mode: "instant",
      channels: ["email"],
    };
  }
  return null;
}

// One level down: the part itself is a goal, because you farm the part, and what the part is built
// from is a goal too, because you farm that separately. Counts merge as they are added.
export function explodeRecipe(components: Component[], parts: Map<string, Part>): GoalLine[] {
  const lines: GoalLine[] = [];
  const seen = new Map<string, GoalLine>();
  const push = (itemName: string, count: number) => {
    const existing = seen.get(itemName);
    if (existing) {
      existing.count += count;
      return;
    }
    const line = { itemName, count };
    seen.set(itemName, line);
    lines.push(line);
  };

  for (const component of components) {
    const part = parts.get(component.itemType);
    if (!part) continue;
    push(part.name, component.count);
    for (const ingredient of part.components) {
      const inner = parts.get(ingredient.itemType);
      if (inner) push(inner.name, ingredient.count * component.count);
    }
  }
  return lines;
}
