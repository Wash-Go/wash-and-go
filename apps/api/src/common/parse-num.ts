import { BadRequestException } from '@nestjs/common';

// Parse a query-string number, rejecting non-numeric input with a 400 instead of
// letting a silent NaN flow into haversine/coverage math.
export function parseFiniteNumber(v: string, name: string): number {
  // Number('') is 0 — treat empty/whitespace as missing, not zero.
  if (v == null || v.trim() === '') {
    throw new BadRequestException(`${name} must be a number`);
  }
  const n = Number(v);
  if (!Number.isFinite(n)) {
    throw new BadRequestException(`${name} must be a number`);
  }
  return n;
}
