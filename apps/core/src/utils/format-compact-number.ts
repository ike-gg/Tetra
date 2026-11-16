const UNITS = [
  { value: 1e3, suffix: "k" },
  { value: 1e6, suffix: "M" },
  { value: 1e9, suffix: "B" },
] as const;

/** 999 → 999, 1000 → 1k, 13634 → 13.6k, 999_950 → 1M, 1_250_000_000 → 1.3B */
export const formatCompactNumber = (input: number): string => {
  const sign = input < 0 ? "-" : "";
  const value = Math.abs(input);

  if (value < 999.5) return `${sign}${Math.round(value)}`;

  for (const [index, unit] of UNITS.entries()) {
    const scaled = Math.round((value / unit.value) * 10) / 10;
    // Rounding can reach 1000 of a unit (999_950 → 1000k): move on to the next one
    if (scaled < 1000 || index === UNITS.length - 1) {
      return `${sign}${scaled}${unit.suffix}`;
    }
  }

  return `${sign}${Math.round(value)}`;
};
