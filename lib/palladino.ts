import data from "./palladino.json";

// Palladino trades Riven Slivers in Iron Wake, one purchase of each per week. Nothing in DE's feed
// or any API says what she stocks, so the list is the wiki's Usage table, read once and kept here.
export interface PalladinoWare {
  key: string;
  item: string;
  slivers: number;
}

export const PALLADINO_WARES: PalladinoWare[] = data.wares;

export const PALLADINO_SOURCE = { url: data.source, api: data.api, fetchedAt: data.fetchedAt };

export function wareLabel(ware: PalladinoWare): string {
  return `${ware.item} for ${ware.slivers} Riven Sliver${ware.slivers === 1 ? "" : "s"}`;
}
