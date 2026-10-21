// Fixed list of schools; each school's classroom code is its name without spaces,
// except schools listed in CODE_OVERRIDES.
export const SCHOOLS = [
  "SDN 1 BNW", "SDN 2 BNW", "SDN 3 BNW", "SDN 4 BNW", "SDN 5 BNW", "SDN 6 BNW", "SDN 7 BNW",
  "SDN 8 BNW", "SDN 9 BNW", "SDN 10 BNW", "SDN 11 BNW", "SDN 12 BNW", "SDN 13 BNW", "SDN 14 BNW",
  "SDN 15 BNW", "SDN 16 BNW", "SDN 17 BNW", "SDN 18 BNW", "SDN 19 BNW", "SDN 20 BNW", "SDN 22 BNW",
  "SDN 23 BNW", "SDN 24 BNW", "SDN 25 BNW", "SDN 26 BNW", "SD YPPI", "SD MUH 1", "SD MUH 2", "SDIT IK",
] as const;

const CODE_OVERRIDES: Record<string, string> = {
  "SDIT IK": "SDIT",
};

export function schoolCode(name: string) {
  const override = CODE_OVERRIDES[name.trim()];
  if (override) return override;
  return name.replace(/\s+/g, "").toUpperCase();
}

export function findSchoolByCode(code: string) {
  const upper = code.toUpperCase();
  return SCHOOLS.find((s) => schoolCode(s) === upper)
    ?? Object.keys(CODE_OVERRIDES).find((s) => schoolCode(s) === upper.replace(/\s+/g, ""));
}
