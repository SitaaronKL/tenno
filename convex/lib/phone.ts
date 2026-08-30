// Phones arrive typed by hand in settings and machine formatted from Photon, so store one shape.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? "" : `+${digits}`;
}
