import type { PlatformConfigPatch, PlatformConfigView } from '@wash-and-go/domain';

export type ConfigField = keyof Omit<PlatformConfigView, 'updatedAt'>;

export interface FieldMeta {
  key: ConfigField;
  label: string;
  hint?: string;
  unit?: string;
}

export interface ConfigGroup {
  title: string;
  note?: string;
  placeholder?: boolean; // editable but no consumer yet
  fields: FieldMeta[];
}

// Editor layout. Grouped by what the rule affects; the placeholder group is
// flagged so the UI can label it "not yet applied" (honest: those fields are
// inert until matching/floor/fee code lands).
export const CONFIG_GROUPS: ConfigGroup[] = [
  {
    title: 'Fees',
    fields: [
      {
        key: 'serviceFeePhp',
        label: 'Service fee',
        unit: '₱',
        hint: 'Flat platform fee added to every order.',
      },
    ],
  },
  {
    title: 'Delivery',
    note: 'Fee = base + (round-trip km − free radius) × per-km, capped at the max.',
    fields: [
      { key: 'deliveryBasePhp', label: 'Base fee', unit: '₱' },
      {
        key: 'deliveryFreeKm',
        label: 'Free radius',
        unit: 'km',
        hint: 'Round-trip km included before per-km applies.',
      },
      { key: 'deliveryPerKmPhp', label: 'Per km', unit: '₱' },
      { key: 'deliveryMaxPhp', label: 'Cap', unit: '₱' },
      {
        key: 'deliveryRoadFactor',
        label: 'Road factor',
        hint: 'Haversine → road-distance multiplier (~1.3). Drops out when routing API lands.',
      },
    ],
  },
  {
    title: 'Matching',
    fields: [
      {
        key: 'maxResolveKm',
        label: 'Max resolve radius',
        unit: 'km',
        hint: 'Reject a booking if the nearest shop is farther than this.',
      },
    ],
  },
  {
    title: 'Dispatch & tiers',
    fields: [
      {
        key: 'expressWeightThresholdKg',
        label: 'Express weight cutoff',
        unit: 'kg',
        hint: 'At/under → Express (Tier 2, e-bike); over → Scheduled (Tier 1).',
      },
      {
        key: 'autoDispatchEnabled',
        label: 'Auto-dispatch',
        hint: '1 = auto-assign the least-loaded rider on Express booking; 0 = manual dispatch only.',
      },
    ],
  },
  {
    title: 'Not yet applied',
    placeholder: true,
    note: 'Editable now, but no code consumes these yet — changing them has no effect until the price-floor / platform-fee features ship.',
    fields: [
      { key: 'minOrderPricePhp', label: 'Minimum order price', unit: '₱' },
      { key: 'platformFeePhp', label: 'Platform fee', unit: '₱' },
    ],
  },
];

export const CONFIG_FIELDS: ConfigField[] = CONFIG_GROUPS.flatMap((g) =>
  g.fields.map((f) => f.key),
);

// Mirror of the server guard (finite, ≥ 0). Returns an error string or null.
export function validateField(v: number): string | null {
  if (Number.isNaN(v) || !Number.isFinite(v) || v < 0) {
    return 'Must be a number ≥ 0';
  }
  return null;
}

// Only send the fields that actually changed (PUT patches).
export function diffPatch(
  orig: PlatformConfigView,
  edited: Record<ConfigField, number>,
): PlatformConfigPatch {
  const patch: PlatformConfigPatch = {};
  for (const k of CONFIG_FIELDS) {
    if (edited[k] !== orig[k]) patch[k] = edited[k];
  }
  return patch;
}
