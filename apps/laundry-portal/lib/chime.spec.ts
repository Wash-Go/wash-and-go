import { CHIME_COOLDOWN_MS, CHIME_KEY, CHIME_NOTES, readChimePref, shouldChime, writeChimePref } from './chime';

const store = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    m,
  };
};
const broken = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('chime preference', () => {
  it('is off unless the shop turned it on', () => {
    expect(readChimePref(store())).toBe(false);
    expect(readChimePref(null)).toBe(false);
    expect(readChimePref(broken)).toBe(false);
    expect(readChimePref(store({ [CHIME_KEY]: '1' }))).toBe(true);
  });

  it('remembers the choice and survives blocked storage', () => {
    const s = store();
    writeChimePref(s, true);
    expect(s.m.get(CHIME_KEY)).toBe('1');
    writeChimePref(s, false);
    expect(readChimePref(s)).toBe(false);
    expect(() => writeChimePref(broken, true)).not.toThrow();
    expect(() => writeChimePref(null, true)).not.toThrow();
  });
});

describe('shouldChime', () => {
  const base = { enabled: true, unlocked: true, arrived: 1, lastAt: null, now: 100_000 };

  it('plays for a new order when on and unlocked', () => {
    expect(shouldChime(base)).toBe(true);
  });

  it('never plays before a user gesture has unlocked audio', () => {
    expect(shouldChime({ ...base, unlocked: false })).toBe(false);
  });

  it('stays quiet when off or nothing arrived', () => {
    expect(shouldChime({ ...base, enabled: false })).toBe(false);
    expect(shouldChime({ ...base, arrived: 0 })).toBe(false);
  });

  it('does not stack chimes inside the cooldown', () => {
    expect(shouldChime({ ...base, lastAt: base.now - CHIME_COOLDOWN_MS + 1 })).toBe(false);
    expect(shouldChime({ ...base, lastAt: base.now - CHIME_COOLDOWN_MS })).toBe(true);
  });
});

describe('CHIME_NOTES', () => {
  it('is a short two-tone, rising, under a second', () => {
    expect(CHIME_NOTES).toHaveLength(2);
    expect(CHIME_NOTES[1].hz).toBeGreaterThan(CHIME_NOTES[0].hz);
    const end = Math.max(...CHIME_NOTES.map((n) => n.at + n.dur));
    expect(end).toBeLessThan(1);
  });
});
