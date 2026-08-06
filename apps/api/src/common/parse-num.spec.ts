import { BadRequestException } from '@nestjs/common';
import { parseFiniteNumber } from './parse-num';

describe('parseFiniteNumber', () => {
  it('parses a numeric string', () => {
    expect(parseFiniteNumber('6.9111', 'lat')).toBe(6.9111);
    expect(parseFiniteNumber('-122', 'lng')).toBe(-122);
  });

  it('rejects non-numeric input with a 400', () => {
    expect(() => parseFiniteNumber('abc', 'lat')).toThrow(BadRequestException);
    expect(() => parseFiniteNumber('', 'lat')).toThrow(BadRequestException);
    expect(() => parseFiniteNumber('NaN', 'lat')).toThrow(BadRequestException);
  });
});
