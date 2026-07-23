import { TomTomProvider } from '../src/maps/tomtom.provider';

// D10 spike: exercises the real TomTom adapter against Zamboanga data.
// Run: TOMTOM_API_KEY=... npx ts-node scripts/maps-spike.ts   (from apps/api)
const KEY = process.env.TOMTOM_API_KEY;
if (!KEY) {
  console.error('Set TOMTOM_API_KEY');
  process.exit(1);
}
const p = new TomTomProvider(KEY);

const ADDRESSES = [
  'Tetuan, Zamboanga City',
  'Guiwan, Zamboanga City',
  'Ateneo de Zamboanga University',
  'Paseo del Mar, Zamboanga City',
  'KCC Mall de Zamboanga',
  'Zamboanga City Hall',
];

async function main() {
  console.log('=== GEOCODE (Search API) ===');
  const pts: Record<string, { lat: number; lng: number }> = {};
  for (const a of ADDRESSES) {
    const r = await p.geocode(a);
    if (r) {
      pts[a] = r.point;
      console.log(
        `  OK  ${a} -> ${r.point.lat.toFixed(5)},${r.point.lng.toFixed(5)}  "${r.label}"  score=${r.score?.toFixed(2)}`,
      );
    } else {
      console.log(`  --  ${a} -> null`);
    }
  }

  console.log('\n=== ROUTE (Routing API) ===');
  const a = pts['Tetuan, Zamboanga City'];
  const b = pts['KCC Mall de Zamboanga'];
  if (a && b) {
    const route = await p.route(a, b);
    console.log(
      `  Tetuan -> KCC Mall: ${route.distanceKm.toFixed(2)} km, ${Math.round(route.durationSec / 60)} min`,
    );
  }

  console.log('\n=== REVERSE GEOCODE ===');
  const rev = await p.reverseGeocode({ lat: 6.9111, lng: 122.0794 });
  console.log(`  6.9111,122.0794 -> ${rev ?? 'null (Reverse Geocoding API not enabled)'}`);
}

main().catch((e) => {
  console.error('SPIKE ERROR:', e);
  process.exit(1);
});
