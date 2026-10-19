import { ApiError } from '@wash-and-go/api-client';
import { mutationErrorMessage, shouldRefreshQueue } from './mutation-errors';

// The portal never shows raw server text or URLs: every failure maps to short
// human copy. Known API messages that are already human map to their own text.
describe('mutationErrorMessage', () => {
  it('explains a network failure (no HTTP status) per action', () => {
    const offline = new TypeError('Failed to fetch http://localhost:4000/orders/o1/weigh');
    expect(mutationErrorMessage('weigh', offline)).toBe(
      "Couldn't save the weight. Check your connection and try again.",
    );
    expect(mutationErrorMessage('preview', offline)).toBe(
      "Couldn't get the new price. Check your connection and try again.",
    );
    expect(mutationErrorMessage('status', offline)).toBe(
      "Couldn't update the order. Check your connection and try again.",
    );
  });

  it('passes through the API’s own human messages', () => {
    expect(
      mutationErrorMessage(
        'status',
        new ApiError(400, 'Weigh this order before marking it ready'),
      ),
    ).toBe('Weigh this order before marking it ready.');
    // class-validator can send the same message twice (array → "a,a").
    const range = 'Enter a weight above 0 kg and no more than 50 kg.';
    expect(mutationErrorMessage('weigh', new ApiError(400, `${range},${range}`))).toBe(range);
    expect(
      mutationErrorMessage('weigh', new ApiError(409, 'Order is not at the shop for weighing')),
    ).toBe("This order isn't at the shop anymore, so its weight can't change.");
  });

  it('maps a conflict to "it moved on" rather than the raw server text', () => {
    const msg = mutationErrorMessage(
      'status',
      new ApiError(409, 'Illegal transition READY_FOR_RETURN → READY_FOR_RETURN'),
    );
    expect(msg).toBe('This order has already moved on. The queue has been refreshed.');
  });

  it('never leaks raw server text on a 500', () => {
    const msg = mutationErrorMessage(
      'weigh',
      new ApiError(500, 'PrismaClientKnownRequestError: connect ECONNREFUSED https://db.internal'),
    );
    expect(msg).toBe("Couldn't save the weight. Try again in a moment.");
    expect(msg).not.toMatch(/prisma|http|ECONN/i);
  });

  it('covers sign-in, access, missing and throttled', () => {
    expect(mutationErrorMessage('status', new ApiError(401, 'Unauthorized'))).toBe(
      'Your sign-in expired. Sign in again, then retry.',
    );
    expect(mutationErrorMessage('weigh', new ApiError(403, 'Not a member of this shop'))).toBe(
      "Your account can't change this order.",
    );
    expect(mutationErrorMessage('status', new ApiError(404, 'Order not found'))).toBe(
      'This order no longer exists. The queue has been refreshed.',
    );
    expect(mutationErrorMessage('preview', new ApiError(429, 'ThrottlerException'))).toBe(
      'Too many attempts — try again in a minute.',
    );
  });

  it('falls back to a generic check-and-retry line for an unknown 400', () => {
    expect(mutationErrorMessage('weigh', new ApiError(400, 'weightKg must be a number'))).toBe(
      'Check the weight and try again.',
    );
    expect(mutationErrorMessage('status', new ApiError(400, 'status must be one of …'))).toBe(
      "Couldn't update the order. Try again in a moment.",
    );
  });
});

describe('shouldRefreshQueue', () => {
  it('refetches when the order changed under us (404/409), not on a network blip', () => {
    expect(shouldRefreshQueue(new ApiError(409, 'x'))).toBe(true);
    expect(shouldRefreshQueue(new ApiError(404, 'x'))).toBe(true);
    expect(shouldRefreshQueue(new ApiError(500, 'x'))).toBe(false);
    expect(shouldRefreshQueue(new TypeError('Failed to fetch'))).toBe(false);
  });
});
