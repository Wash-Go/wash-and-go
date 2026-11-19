'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

// Zamboanga City centre: the map opens here until the shop has a pin.
export const ZAMBOANGA: [number, number] = [6.9214, 122.079];

// Keyless OpenStreetMap raster tiles, as the admin map uses. The plan named
// CARTO, but CARTO's basemaps now answer every tile with "API KEY REQUIRED"
// (checked 2026-10-20). Dark mode darkens the same tiles with a CSS filter
// (.tiles-dark in onboarding.css), since there is no keyless dark OSM style.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '© OpenStreetMap contributors';

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

function Recenter({ lat, lng, focusKey }: { lat: number | null; lng: number | null; focusKey: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat != null && lng != null) map.setView([lat, lng], Math.max(map.getZoom(), 16));
  }, [focusKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(round6(e.latlng.lat), round6(e.latlng.lng)) });
  return null;
}

// Loaded with next/dynamic (ssr:false): Leaflet touches window on import.
export default function LocationMap({
  lat,
  lng,
  dark,
  focusKey,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  dark: boolean;
  focusKey: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const icon = useMemo(
    () => L.divIcon({ className: 'map-pin', html: '<span></span>', iconSize: [44, 44], iconAnchor: [22, 22] }),
    [],
  );
  const hasPin = lat != null && lng != null;
  return (
    <MapContainer
      center={hasPin ? [lat, lng] : ZAMBOANGA}
      zoom={hasPin ? 16 : 13}
      scrollWheelZoom={false}
      attributionControl
    >
      <TileLayer
        key={dark ? 'dark' : 'light'}
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        maxZoom={19}
        className={dark ? 'tiles-dark' : undefined}
      />
      <ClickToPlace onPick={onPick} />
      <Recenter lat={lat} lng={lng} focusKey={focusKey} />
      {hasPin ? (
        <Marker
          position={[lat, lng]}
          icon={icon}
          draggable
          keyboard
          title="Your shop. Drag to move."
          alt="Your shop pin"
          eventHandlers={{
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              onPick(round6(p.lat), round6(p.lng));
            },
          }}
        />
      ) : null}
    </MapContainer>
  );
}
