import data from "./palladino.json";

// Palladino trades Riven Slivers in Iron Wake, one purchase of each per week. Nothing in DE's feed
// or any API says what she stocks, so the list is the wiki's Usage table, read once and kept here.
export interface PalladinoWare {
  key: string;
  item: string;
  slivers: number;
}

// Cast once here, so tsc sees a small shape instead of a literal type per row.
const FILE = data as { wares: PalladinoWare[]; source: string; api: string; fetchedAt: string };

export const PALLADINO_WARES: PalladinoWare[] = FILE.wares;

export const PALLADINO_SOURCE = { url: FILE.source, api: FILE.api, fetchedAt: FILE.fetchedAt };

export function wareLabel(ware: PalladinoWare): string {
  return `${ware.item} for ${ware.slivers} Riven Sliver${ware.slivers === 1 ? "" : "s"}`;
}
