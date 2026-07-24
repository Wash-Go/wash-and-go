// Multi-factor shop selection (P4b + Reviews). Factors, in priority order:
//   1. express capacity (Express only) — a shop already at its daily express cap
//      is deprioritized so the quote doesn't recommend a shop that will 409 at
//      booking
//   2. distance — nearest wins
//   3. turnaround — the faster shop breaks a distance tie
//   4. rating — higher average stars breaks a distance+turnaround tie
// (Rating is a tiebreaker, not a weighted factor — how heavily rating should
// outweigh distance is a product decision, left conservative for now.)

export interface ShopCandidate {
  shopServiceId: string;
  shopId: string;
  km: number;
  turnaroundHours: number;
  slotsPerDay: number; // Shop.expressSlotsPerDay (daily Express cap)
  usedToday: number; // Express orders already booked at this shop today
  avgRating: number; // average customer stars (0 when unrated)
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
    if (a.avgRating !== b.avgRating) return b.avgRating - a.avgRating; // higher first
    return a.shopServiceId.localeCompare(b.shopServiceId); // deterministic
  });
}
