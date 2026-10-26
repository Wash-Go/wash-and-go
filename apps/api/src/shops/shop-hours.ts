import { BadRequestException } from '@nestjs/common';
import { IsInt, IsString, Matches, Max, Min, ValidateIf } from 'class-validator';

/*
 * The weekly opening grid shared by onboarding (wizard step 4) and the
 * verified-shop profile (PATCH /shop/me). Stored in Shop.hours (JSONB) only
 * through normalizeHours, so the column always holds this exact shape.
 */

// 24-hour 'HH:MM', 00:00–23:59. Lexical order of two matches is time order.
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Stored/returned shape: 7 entries sorted by day (0 = Sunday … 6 = Saturday,
// JS Date#getDay); null open/close = closed that day.
export interface ShopHoursDay {
  day: number;
  open: string | null;
  close: string | null;
}

// One request entry. Both-or-neither, open < close and one-per-day are
// cross-field rules checked by normalizeHours.
export class ShopHoursDayDto {
  @IsInt() @Min(0) @Max(6) day!: number;
  @ValidateIf((o: ShopHoursDayDto) => o.open !== null)
  @IsString()
  @Matches(HHMM, { message: 'open must be HH:MM (24-hour)' })
  open!: string | null;
  @ValidateIf((o: ShopHoursDayDto) => o.close !== null)
  @IsString()
  @Matches(HHMM, { message: 'close must be HH:MM (24-hour)' })
  close!: string | null;
}

// Cross-field checks the DTO can't express: one entry per weekday, open/close
// both set or both null, open strictly before close. Returns the canonical
// (day-sorted, extra-key-free) grid or throws 400.
export function normalizeHours(hours: ShopHoursDayDto[]): ShopHoursDay[] {
  const days = new Set(hours.map((h) => h.day));
  if (hours.length !== 7 || days.size !== 7) {
    throw new BadRequestException('Hours need exactly one entry for each day of the week');
  }
  for (const h of hours) {
    if ((h.open === null) !== (h.close === null)) {
      throw new BadRequestException('Set both opening and closing time, or mark the day closed');
    }
    if (h.open !== null && h.close !== null && h.open >= h.close) {
      throw new BadRequestException('Opening time must be before closing time');
    }
  }
  return [...hours]
    .sort((a, b) => a.day - b.day)
    .map((h) => ({ day: h.day, open: h.open, close: h.close }));
}
