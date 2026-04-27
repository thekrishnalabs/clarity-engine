// UID generator: HK-{SESSION}-{YYYYMMDD}-{CITY}-{RAND4}
export function generateUid(opts: {
  sessionCode: string;
  dateOfBirth: string; // YYYY-MM-DD
  cityCode: string;
}): string {
  const compactDob = opts.dateOfBirth.replace(/-/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const city = (opts.cityCode || "XX").toUpperCase().slice(0, 4);
  return `HK-${opts.sessionCode.toUpperCase()}-${compactDob}-${city}-${rand}`;
}

export function cityCodeFrom(place: string): string {
  const clean = place.replace(/[^a-zA-Z]/g, "");
  return (clean.slice(0, 3) || "XXX").toUpperCase();
}
