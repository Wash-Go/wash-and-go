// Shop monogram for the header lockup (B8): up to two letters from the shop
// name, navy on sky-tint. null = show the Wash & Go whale alone (no name yet,
// or the API's draft default "My laundry").
const DEFAULT_NAME = 'my laundry';

export function monogram(name: string | null | undefined): string | null {
  const n = (name ?? '').trim();
  if (!n || n.toLowerCase() === DEFAULT_NAME) return null;
  // Letters and digits only (any script); everything else separates words.
  const words = n
    .replace(/['’]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (!words.length) return null;
  const pick =
    words.length === 1 ? Array.from(words[0]).slice(0, 2).join('') : `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`;
  return pick.toLocaleUpperCase('en-PH');
}
