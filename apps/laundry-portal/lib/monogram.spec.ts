import { monogram } from './monogram';

describe('monogram', () => {
  it('takes the first letters of the first two words', () => {
    expect(monogram('Tetuan Laundry Hub')).toBe('TL');
    expect(monogram('guiwan wash center')).toBe('GW');
  });
  it('uses the first two letters of a single word', () => {
    expect(monogram('Labada')).toBe('LA');
    expect(monogram('Q')).toBe('Q');
  });
  it('strips punctuation and emoji', () => {
    expect(monogram("Lola's Wash & Fold")).toBe('LW');
    expect(monogram('🧺 Sudsy — Laundry!')).toBe('SL');
    expect(monogram('...')).toBeNull();
  });
  it('keeps letters with accents and digits', () => {
    expect(monogram('Ñora Labahan')).toBe('ÑL');
    expect(monogram('24 Seven Wash')).toBe('2S');
  });
  it('shows the whale only for no name or the API default "My laundry"', () => {
    expect(monogram('My laundry')).toBeNull();
    expect(monogram('  ')).toBeNull();
    expect(monogram(null)).toBeNull();
  });
});
