'use client';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useId, useRef, useState } from 'react';
import { TextField } from '../auth/TextField';
import { api } from '../../lib/api';
import { useMedia } from '../../lib/useMedia';
import { MAX_ADDRESS, pinAddressUpdate } from '../../lib/wizard';
import { FieldError } from './fields';
import type { FieldProps } from './types';

const LocationMap = dynamic(() => import('./LocationMap'), {
  ssr: false,
  loading: () => <div className="wiz-map" aria-busy="true" />,
});

const MIN_QUERY = 3;
const DEBOUNCE_MS = 400;

// Step 2 · Location: address search (/geocode/search) → address + pin; a
// draggable pin on a CARTO map; moving the pin reverse-geocodes into the
// address line, which the owner can then edit (add a landmark).
export function LocationStep({ draft, set, errors }: FieldProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focusKey, setFocusKey] = useState(0);
  const [fromPin, setFromPin] = useState(false);
  // The owner typed in the address field: later pin moves keep their text.
  const [addressEdited, setAddressEdited] = useState(false);
  const [pinKept, setPinKept] = useState(false);
  const editedRef = useRef(false);
  editedRef.current = addressEdited;
  const dark = useMedia('(prefers-color-scheme: dark)');
  const reverseSeq = useRef(0);
  const listId = useId();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const search = useQuery({
    queryKey: ['geocode-search', debounced],
    queryFn: () => api.geocodeSearch(debounced, 5),
    enabled: debounced.length >= MIN_QUERY,
    refetchInterval: false,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const pick = (lat: number, lng: number) => {
    set({ lat, lng });
    const seq = ++reverseSeq.current;
    api
      .reverseGeocode(lat, lng)
      .then((r) => {
        if (seq !== reverseSeq.current) return;
        const address = pinAddressUpdate({ addressEdited: editedRef.current }, r.label ?? '');
        if (address == null) {
          setPinKept(editedRef.current);
          return;
        }
        set({ address });
        setFromPin(true);
        setPinKept(false);
      })
      .catch(() => undefined); // keep whatever the owner typed
  };

  const showResults = debounced.length >= MIN_QUERY && query.trim().length >= MIN_QUERY;
  const hits = search.data ?? [];

  return (
    <div className="wiz-section">
      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field-label" htmlFor={`${listId}-q`}>
          Search for your address
        </label>
        <div className="input-row">
          <input
            id={`${listId}-q`}
            className="input"
            type="search"
            autoComplete="off"
            placeholder="Street, barangay or landmark"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-controls={showResults ? listId : undefined}
          />
        </div>
        <div className="field-hint">Type at least 3 letters. Pick a result, then fine-tune the pin.</div>
      </div>
      {showResults ? (
        <div id={listId} aria-live="polite">
          {search.isFetching && !hits.length ? (
            <p className="small muted">Searching…</p>
          ) : search.isError ? (
            <p className="small muted">Search isn&rsquo;t working right now. Type your address below and tap the map to place the pin.</p>
          ) : hits.length ? (
            <ul className="wiz-results" aria-label="Address results">
              {hits.map((h, i) => (
                <li key={`${h.label}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      set({ address: h.label.slice(0, MAX_ADDRESS), lat: h.point.lat, lng: h.point.lng });
                      setFromPin(false);
                      setAddressEdited(false);
                      setPinKept(false);
                      setQuery('');
                      setDebounced('');
                      setFocusKey((k) => k + 1);
                    }}
                  >
                    <Search aria-hidden="true" />
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : search.isSuccess ? (
            <p className="small muted">No match. Type your address below and tap the map to place the pin.</p>
          ) : null}
        </div>
      ) : null}

      <div>
        <div className="wiz-map" data-testid="location-map" aria-label="Map. Tap to place your shop’s pin, or drag the pin.">
          <LocationMap lat={draft.lat} lng={draft.lng} dark={dark} focusKey={focusKey} onPick={pick} />
        </div>
        <p className="small muted" style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
          <MapPin aria-hidden="true" size={16} />
          {draft.lat != null && draft.lng != null ? (
            <span>
              Pin at{' '}
              <span className="mono" data-testid="pin-coords">
                {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
              </span>
              . Drag it onto your door.
            </span>
          ) : (
            <span>Tap the map where your shop is.</span>
          )}
        </p>
        <FieldError>{errors.pin}</FieldError>
      </div>

      <TextField
        label="Address and landmark"
        autoComplete="street-address"
        maxLength={MAX_ADDRESS}
        value={draft.address}
        onValue={(address) => {
          set({ address });
          setAddressEdited(true);
          setPinKept(false);
        }}
        error={errors.address}
        hint={
          pinKept
            ? 'Pin moved. We kept the address you typed.'
            : fromPin && !addressEdited
              ? 'Filled in from the pin. Add a landmark riders can spot, e.g. “beside Tetuan church”.'
              : 'Add a landmark riders can spot, e.g. “beside Tetuan church”.'
        }
      />
      <div className="wiz-preview" role="note">
        Customers within your zone will see you.
      </div>
    </div>
  );
}
