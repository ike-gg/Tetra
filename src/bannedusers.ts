interface BanDetails {
  userId: string;
  reason?: string;
}

export const BANNEDLIST: BanDetails[] = [
  { userId: "388315180854935552", reason: "idiota" },
  {
    userId: "284815589241913346",
    reason:
      "Dostęp został ograniczony, zauważyliśmy podejrzaną aktywność i dla bezpieczeństwa ograniczyliśmy twój dostęp",
  },
];
