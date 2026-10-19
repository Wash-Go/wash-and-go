import { ApiError } from '@wash-and-go/api-client';
import { mutationErrorMessage, shouldRefresh } from './mutation-errors';

// Admin mutations never show raw server text or URLs: every failure maps to
// short human copy. API messages already written for people map to our own copy.
describe('mutationErrorMessage', () => {
  it('explains a network failure (no HTTP status) per action', () => {
    const offline = new TypeError('Failed to fetch http://localhost:4000/admin/remittance/close');
    expect(mutationErrorMessage('close-week', offline)).toBe(
      "Couldn't close the week. Check your connection and try again.",
    );
    expect(mutationErrorMessage('mark-paid', offline)).toBe(
      "Couldn't mark the batch paid. Check your connection and try again.",
    );
    expect(mutationErrorMessage('record-deposit', offline)).toBe(
      "Couldn't record the deposit. Check your connection and try again.",
    );
  });

  it('never leaks raw server text on a 500', () => {
    const msg = mutationErrorMessage(
      'mark-paid',
      new ApiError(500, 'PrismaClientKnownRequestError: connect ECONNREFUSED https://db.internal'),
    );
    expect(msg).toBe("Couldn't mark the batch paid. Try again in a moment.");
    expect(msg).not.toMatch(/prisma|http|ECONN/i);
  });

  it('maps the API’s own rider-dispatch reasons to admin copy', () => {
    expect(
      mutationErrorMessage('assign-rider', new ApiError(400, 'Rider is not verified yet')),
    ).toBe("This rider isn't verified yet, so they can't take jobs.");
    expect(
      mutationErrorMessage(
        'assign-rider',
        new ApiError(
          400,
          'Rider is over the ₱2000 cash limit — they must deposit before taking new jobs',
        ),
      ),
    ).toBe('This rider is over the cash limit. Record their deposit on Rider cash first.');
    expect(
      mutationErrorMessage('assign-rider', new ApiError(400, 'Assignee is not a rider')),
    ).toBe("That account isn't a rider.");
  });

  it('maps money-path reasons to admin copy', () => {
    expect(
      mutationErrorMessage(
        'close-week',
        new ApiError(409, 'This payout period was closed concurrently — please retry.'),
      ),
    ).toBe('Someone else closed this week at the same moment. The batches have been refreshed.');
    expect(
      mutationErrorMessage(
        'record-deposit',
        new ApiError(400, 'Deposit amount must be a positive number'),
      ),
    ).toBe('Enter a deposit amount above ₱0.');
  });

  it('says an order moved on for an order-action conflict', () => {
    const conflict = new ApiError(409, 'Illegal transition DELIVERED → CANCELLED');
    expect(mutationErrorMessage('cancel-order', conflict)).toBe(
      'This order has already moved on. The board updates every few seconds.',
    );
    expect(
      mutationErrorMessage('assign-rider', new ApiError(409, 'Cannot assign a rider from ASSIGNED')),
    ).toBe('This order has already moved on. The board updates every few seconds.');
  });

  it('maps other statuses generically', () => {
    expect(mutationErrorMessage('update-shop', new ApiError(400, 'active must be a boolean'))).toBe(
      "Couldn't update the shop. Check the values and try again.",
    );
    expect(mutationErrorMessage('update-user', new ApiError(401, 'Unauthorized'))).toBe(
      'Your sign-in expired. Sign in again, then retry.',
    );
    expect(mutationErrorMessage('toggle-zone', new ApiError(403, 'Forbidden resource'))).toBe(
      "Your account isn't allowed to do this.",
    );
    expect(mutationErrorMessage('mark-paid', new ApiError(404, 'Batch not found'))).toBe(
      "Couldn't mark the batch paid. It no longer exists.",
    );
    expect(mutationErrorMessage('remove-staff', new ApiError(409, 'x'))).toBe(
      "Couldn't remove the staff member. It changed in the meantime — check the latest and try again.",
    );
    expect(mutationErrorMessage('add-staff', new ApiError(429, 'ThrottlerException'))).toBe(
      'Too many attempts — try again in a minute.',
    );
  });

  it('has copy for every admin action', () => {
    const actions = [
      'cancel-order',
      'assign-rider',
      'close-week',
      'mark-paid',
      'record-deposit',
      'toggle-zone',
      'create-shop',
      'update-shop',
      'add-service',
      'update-service',
      'add-staff',
      'remove-staff',
      'update-user',
    ] as const;
    for (const a of actions) {
      expect(mutationErrorMessage(a, new ApiError(500, 'x'))).toMatch(
        /^Couldn't [a-z ]+\. Try again in a moment\.$/,
      );
    }
  });
});

describe('shouldRefresh', () => {
  it('refetches when the record changed under us (404/409), not on a network blip', () => {
    expect(shouldRefresh(new ApiError(409, 'x'))).toBe(true);
    expect(shouldRefresh(new ApiError(404, 'x'))).toBe(true);
    expect(shouldRefresh(new ApiError(500, 'x'))).toBe(false);
    expect(shouldRefresh(new TypeError('Failed to fetch'))).toBe(false);
  });
});
