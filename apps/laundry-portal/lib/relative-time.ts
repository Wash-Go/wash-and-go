// "updated N s ago" for the header and the stale banner. DESIGN.md: dates are
// relative and in Asia/Manila ("Today 4:30pm", "Yesterday"). Pure; `now` is
// passed in so tests do not depend on the clock or the machine's time zone.

const TZ = 'Asia/Manila';

const clockFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});
const dayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });

// "3:12pm" in Manila.
export function manilaClock(d: Date): string {
  return clockFmt.format(d).replace(/\s/g, '').toLowerCase();
}

// Manila calendar day as a sortable key (YYYY-MM-DD).
function manilaDay(ms: number): string {
  return dayFmt.format(new Date(ms));
}

const SEC = 1_000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatUpdatedAgo(then: number | null | undefined, now: number): string {
  if (then == null) return 'not updated yet';
  const diff = now - then;
  if (diff < 5 * SEC) return 'updated just now';
  if (diff < MIN) return `updated ${Math.floor(diff / SEC)} s ago`;
  if (diff < HOUR) return `updated ${Math.floor(diff / MIN)} min ago`;
  if (diff < 6 * HOUR) return `updated ${Math.floor(diff / HOUR)} h ago`;
  const day = manilaDay(then);
  const clock = manilaClock(new Date(then));
  if (day === manilaDay(now)) return `updated today ${clock}`;
  if (day === manilaDay(now - DAY)) return `updated yesterday ${clock}`;
  return `updated ${dateFmt.format(new Date(then))}, ${clock}`;
}
