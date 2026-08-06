import { JsonLogger } from './json-logger';

// In prod the value is machine-parseable lines with a stable shape; the exception
// filter and boot logs depend on that shape holding.
describe('JsonLogger (production mode)', () => {
  const original = process.env.NODE_ENV;
  let out: string[];
  let err: string[];
  let outSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    out = [];
    err = [];
    outSpy = jest
      .spyOn(process.stdout, 'write')
      .mockImplementation((c: string | Uint8Array) => (out.push(String(c)), true));
    errSpy = jest
      .spyOn(process.stderr, 'write')
      .mockImplementation((c: string | Uint8Array) => (err.push(String(c)), true));
  });

  afterEach(() => {
    outSpy.mockRestore();
    errSpy.mockRestore();
    process.env.NODE_ENV = original;
  });

  it('emits a single-line JSON object with level/message/context to stdout', () => {
    new JsonLogger().log('server started', 'Bootstrap');
    expect(out).toHaveLength(1);
    expect(out[0].endsWith('\n')).toBe(true);
    const parsed = JSON.parse(out[0]);
    expect(parsed).toMatchObject({
      level: 'info',
      message: 'server started',
      context: 'Bootstrap',
    });
    expect(typeof parsed.time).toBe('string');
  });

  it('routes errors to stderr and includes the stack', () => {
    new JsonLogger().error('boom', 'Error: boom\n  at x', 'Exceptions');
    expect(out).toHaveLength(0);
    expect(err).toHaveLength(1);
    const parsed = JSON.parse(err[0]);
    expect(parsed).toMatchObject({ level: 'error', message: 'boom', context: 'Exceptions' });
    expect(parsed.stack).toContain('at x');
  });
});
