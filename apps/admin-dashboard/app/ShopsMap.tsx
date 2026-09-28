'use client';
import 'leaflet/dist/leaflet.css';
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import type { AdminShopView } from '@wash-and-go/domain';
import { c } from '../lib/theme';

// Zamboanga City centroid — the map falls back here when no shop has coords.
const ZAMBOANGA: [number, number] = [6.9214, 122.079];

// Color a pin by lifecycle: green = live, amber = awaiting review, grey = draft/
// rejected/inactive.
function tone(s: AdminShopView): string {
  if (s.status === 'SUBMITTED') return '#B7791F';
  if (s.status === 'VERIFIED' && s.active) return c.success;
  return c.muted;
}

// Key-free OpenStreetMap. To move to TomTom later, swap the TileLayer url +
// attribution for the TomTom raster tile endpoint (adds the key) — nothing else changes.
export default function ShopsMap({ shops }: { shops: AdminShopView[] }) {
  const pins = shops
    .map((s) => ({ s, la: Number(s.lat), lo: Number(s.lng) }))
    .filter((p) => Number.isFinite(p.la) && Number.isFinite(p.lo) && !(p.la === 0 && p.lo === 0));
  const center = pins.length ? ([pins[0].la, pins[0].lo] as [number, number]) : ZAMBOANGA;

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: 320, width: '100%', borderRadius: 12 }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pins.map(({ s, la, lo }) => (
        <CircleMarker
          key={s.id}
          center={[la, lo]}
          radius={8}
          pathOptions={{ color: tone(s), fillColor: tone(s), fillOpacity: 0.75, weight: 2 }}
        >
          <Tooltip>
            {s.name} · {s.status}
            {s.active ? '' : ' · inactive'}
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
