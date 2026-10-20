import { authHeaders, parseDriverArgs, remainingDriverSteps } from './demo-driver';

describe('parseDriverArgs', () => {
  it('defaults: 20 s steps, waits, a generated run id', () => {
    const a = parseDriverArgs([], () => 'gen-1');
    expect(a).toEqual({ runId: 'gen-1', stepSeconds: 20, wait: true, riderOnly: null });
  });

  it('flags', () => {
    expect(
      parseDriverArgs(['--run', 'pitch', '--step-seconds', '5', '--no-wait'], () => 'x'),
    ).toEqual({ runId: 'pitch', stepSeconds: 5, wait: false, riderOnly: null });
    expect(parseDriverArgs(['--rider-only', 'WG-2026-000123'], () => 'x').riderOnly).toBe(
      'WG-2026-000123',
    );
    expect(parseDriverArgs(['--step-seconds=7'], () => 'x').stepSeconds).toBe(7);
  });

  it.each([['--step-seconds', '-1'], ['--step-seconds', 'abc'], ['--bogus'], ['--run']])(
    'rejects %p',
    (...argv) => {
      expect(() => parseDriverArgs(argv, () => 'x')).toThrow();
    },
  );
});

describe('remainingDriverSteps', () => {
  it.each([
    ['BOOKED', ['ASSIGN', 'PICKED_UP', 'AT_SHOP']],
    ['ASSIGNED', ['PICKED_UP', 'AT_SHOP']],
    ['PICKED_UP', ['AT_SHOP']],
    ['AT_SHOP', []],
    ['PROCESSING', []],
    ['DELIVERED', []],
  ])('from %s → %p', (status, steps) => {
    expect(remainingDriverSteps(status)).toEqual(steps);
  });
});

describe('authHeaders (Firebase-less fallback)', () => {
  it('dev stub: x-dev-uid, never a bearer', () => {
    expect(authHeaders({ kind: 'dev', uid: 'demo-rider' })).toEqual({ 'x-dev-uid': 'demo-rider' });
  });

  it('firebase: a bearer token', () => {
    expect(authHeaders({ kind: 'token', idToken: 'tok' })).toEqual({ authorization: 'Bearer tok' });
  });
});
