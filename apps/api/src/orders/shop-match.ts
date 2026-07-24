// Multi-factor shop selection (P4b). Replaces plain nearest-by-distance. No shop
// rating data exists yet, so the factors are, in priority order:
//   1. express capacity (Express only) — a shop already at its daily express cap
//      is deprioritized so the quote doesn't recommend a shop that will 409 at
//      booking
//   2. distance — nearest wins
//   3. turnaround — the faster shop breaks a distance tie
// Rating joins the ranking when a review model lands.

export interface ShopCandidate {
  shopServiceId: string;
  shopId: string;
  km: number;
  turnaroundHours: number;
  slotsPerDay: number; // Shop.expressSlotsPerDay (daily Express cap)
  usedToday: number; // Express orders already booked at this shop today
}

export function hasExpressCapacity(c: ShopCandidate): boolean {
  return c.usedToday < c.slotsPerDay;
}

// Returns candidates best-first. When capacityAware (Express), shops with room
// float above full ones; otherwise (Scheduled) it's pure distance/turnaround.
export function rankShopCandidates(
  candidates: ShopCandidate[],
  capacityAware: boolean,
): ShopCandidate[] {
  return [...candidates].sort((a, b) => {
    if (capacityAware) {
      const avail = Number(hasExpressCapacity(b)) - Number(hasExpressCapacity(a));
      if (avail !== 0) return avail; // available (true) sorts first
    }
    if (a.km !== b.km) return a.km - b.km;
    if (a.turnaroundHours !== b.turnaroundHours) {
      return a.turnaroundHours - b.turnaroundHours;
    }
    return a.shopServiceId.localeCompare(b.shopServiceId); // deterministic
  });
}
