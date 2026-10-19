import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOnboardingDto } from './shop-onboarding.dto';

// The global ValidationPipe (main.ts) runs transform + class-validator with
// whitelist + forbidNonWhitelisted. A body failing here never reaches the service.
async function errors(body: unknown): Promise<string[]> {
  const errs = await validate(plainToInstance(UpdateOnboardingDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const flat = (es: typeof errs): string[] =>
    es.flatMap((e) => [...Object.values(e.constraints ?? {}), ...flat(e.children ?? [])]);
  return flat(errs);
}

const week = (over: Record<number, unknown> = {}) =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => over[day] ?? { day, open: '08:00', close: '18:00' });

describe('UpdateOnboardingDto — wizard fields', () => {
  it('accepts a full wizard body', async () => {
    expect(
      await errors({
        contactPhone: '0917 123 4567',
        description: 'Wash, dry, fold in Tetuan.',
        hours: week({ 0: { day: 0, open: null, close: null } }),
        expressSlotsPerDay: 10,
      }),
    ).toEqual([]);
  });

  it('caps description at 500 chars', async () => {
    expect(await errors({ description: 'x'.repeat(500) })).toEqual([]);
    expect(await errors({ description: 'x'.repeat(501) })).not.toEqual([]);
  });

  it.each([0, 25, 50])('accepts %p express slots', async (n) => {
    expect(await errors({ expressSlotsPerDay: n })).toEqual([]);
  });

  it.each([-1, 51, 2.5, '10'])('rejects %p express slots', async (n) => {
    expect(await errors({ expressSlotsPerDay: n })).not.toEqual([]);
  });

  it('rejects hours that are not exactly 7 entries', async () => {
    expect(await errors({ hours: week().slice(0, 6) })).not.toEqual([]);
    expect(await errors({ hours: [...week(), { day: 0, open: null, close: null }] })).not.toEqual([]);
  });

  it.each([
    ['day out of range', { day: 7, open: '08:00', close: '18:00' }],
    ['bad time', { day: 1, open: '8am', close: '18:00' }],
    ['hour 24', { day: 1, open: '08:00', close: '24:00' }],
    ['missing close', { day: 1, open: '08:00' }],
    ['extra field', { day: 1, open: '08:00', close: '18:00', note: 'x' }],
  ])('rejects an hours entry with %s', async (_label, entry) => {
    expect(await errors({ hours: week({ 1: entry }) })).not.toEqual([]);
  });

  it('rejects a non-string contact phone', async () => {
    expect(await errors({ contactPhone: 9171234567 })).not.toEqual([]);
  });
});
