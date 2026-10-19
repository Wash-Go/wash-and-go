import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateShopProfileDto } from './shop-profile.dto';

async function errors(body: unknown): Promise<string[]> {
  const errs = await validate(plainToInstance(UpdateShopProfileDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const flat = (es: typeof errs): string[] =>
    es.flatMap((e) => [...Object.values(e.constraints ?? {}), ...flat(e.children ?? [])]);
  return flat(errs);
}

// PATCH /shop/me shares the onboarding field rules (one base DTO) but not the
// proof keys — those only move through onboarding.
describe('UpdateShopProfileDto', () => {
  it('accepts the shared profile fields', async () => {
    expect(
      await errors({
        name: 'Suds',
        address: 'Tetuan',
        lat: 6.9,
        lng: 122.08,
        contactPhone: '09171234567',
        description: 'x',
        hours: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: null, close: null })),
        expressSlotsPerDay: 50,
      }),
    ).toEqual([]);
  });

  it('applies the same bounds as onboarding', async () => {
    expect(await errors({ expressSlotsPerDay: 51 })).not.toEqual([]);
    expect(await errors({ description: 'x'.repeat(501) })).not.toEqual([]);
    expect(await errors({ hours: [] })).not.toEqual([]);
  });

  it.each(['permitKey', 'photoKeys', 'status', 'commissionPct', 'payoutAccountNumber'])(
    'refuses %s',
    async (k) => {
      expect(await errors({ [k]: k === 'photoKeys' ? [] : 'x' })).not.toEqual([]);
    },
  );
});
