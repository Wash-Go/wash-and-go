// New-order chime (plan A3 flow 3): opt-in, remembered per device, played
// only after a user gesture has unlocked audio (browsers block autoplay, and
// the shop never gets a sound it did not ask for). Pure decision logic; the
// Web Audio call lives in chime-audio.ts.

export const CHIME_KEY = 'wg-portal-chime';
export const CHIME_COOLDOWN_MS = 5_000;

// Two short rising tones (A5 → D6), generated: no audio asset to cache.
export const CHIME_NOTES = [
  { hz: 880, at: 0, dur: 0.16 },
  { hz: 1175, at: 0.18, dur: 0.26 },
] as const;

type Reader = { getItem: (k: string) => string | null };
type Writer = { setItem: (k: string, v: string) => void };

export function readChimePref(storage: Reader | null): boolean {
  try {
    return storage?.getItem(CHIME_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeChimePref(storage: Writer | null, on: boolean): void {
  try {
    storage?.setItem(CHIME_KEY, on ? '1' : '0');
  } catch {
    // Private mode / blocked storage: the choice lasts this session only.
  }
}

export function shouldChime(s: {
  enabled: boolean;
  unlocked: boolean;
  arrived: number;
  lastAt: number | null;
  now: number;
}): boolean {
  if (!s.enabled || !s.unlocked || s.arrived <= 0) return false;
  return s.lastAt == null || s.now - s.lastAt >= CHIME_COOLDOWN_MS;
}
