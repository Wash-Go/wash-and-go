import { ApiError } from '@wash-and-go/api-client';
import { OUT_OF_COVERAGE_MESSAGE, bookingErrorMessage, isOutOfCoverage } from './coverage';

// The exact 400 the API sends from quote and create for an out-of-area pickup.
const outOfArea = () => new ApiError(400, 'Pickup location is outside coverage');

describe('isOutOfCoverage', () => {
  it('recognises the API out-of-coverage 400', () => {
    expect(isOutOfCoverage(outOfArea())).toBe(true);
  });

  it('ignores other 400s, other statuses and non-API errors', () => {
    expect(isOutOfCoverage(new ApiError(400, 'Service unavailable'))).toBe(false);
    expect(isOutOfCoverage(new ApiError(500, 'Pickup location is outside coverage'))).toBe(false);
    expect(isOutOfCoverage(new Error('Pickup location is outside coverage'))).toBe(false);
    expect(isOutOfCoverage('Pickup location is outside coverage')).toBe(false);
    expect(isOutOfCoverage(null)).toBe(false);
  });
});

describe('bookingErrorMessage', () => {
  it('turns the out-of-coverage 400 into plain words', () => {
    const msg = bookingErrorMessage(outOfArea(), 'Could not get a quote.');
    expect(msg).toBe(OUT_OF_COVERAGE_MESSAGE);
    expect(msg).toMatch(/^We don't pick up there yet\./);
    expect(msg).not.toMatch(/coverage/i); // no API jargon on screen
  });

  it('passes any other API message through unchanged', () => {
    const e = new ApiError(400, 'Large loads exceed the 6kg Express limit — use our Scheduled service.');
    expect(bookingErrorMessage(e, 'fallback')).toBe(e.message);
  });

  it('uses the fallback when there is no message to show', () => {
    expect(bookingErrorMessage(new Error(''), 'Could not get a quote.')).toBe('Could not get a quote.');
    expect(bookingErrorMessage('boom', 'Could not get a quote.')).toBe('Could not get a quote.');
    expect(bookingErrorMessage(undefined, 'Could not place your order.')).toBe(
      'Could not place your order.',
    );
  });
});
