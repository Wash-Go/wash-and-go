import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PutShopServiceDto } from './shop-services.dto';

async function errors(body: unknown): Promise<string[]> {
  const errs = await validate(plainToInstance(PutShopServiceDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errs.flatMap((e) => Object.values(e.constraints ?? {}));
}

// Same bounds as the admin AddShopServiceDto / UpdateShopServiceDto.
// Bounds: admin DTO bounds plus caps that keep a value inside Decimal(10,2)
// and a sane turnaround (30 days).
describe('PutShopServiceDto', () => {
  it('accepts a rate, turnaround and active flag', async () => {
    expect(await errors({ ratePhp: 25, turnaroundHours: 24, active: true })).toEqual([]);
    expect(await errors({ ratePhp: 99999, turnaroundHours: 720, active: true })).toEqual([]);
    expect(await errors({ ratePhp: 25.5, turnaroundHours: 24, active: true })).toEqual([]);
    expect(await errors({ ratePhp: 0.5, turnaroundHours: 1, active: false })).toEqual([]);
  });

  it.each([0, -1, 'abc', 1e9, 99999.01, 25.555])('rejects ratePhp %p', async (ratePhp) => {
    expect(await errors({ ratePhp, turnaroundHours: 24, active: true })).not.toEqual([]);
  });

  it.each([0, 1.5, -2, 721])('rejects turnaroundHours %p', async (turnaroundHours) => {
    expect(await errors({ ratePhp: 25, turnaroundHours, active: true })).not.toEqual([]);
  });

  it('requires rate, turnaround and active; rejects unknown fields', async () => {
    expect(await errors({ turnaroundHours: 24, active: true })).not.toEqual([]);
    expect(await errors({ ratePhp: 25, active: true })).not.toEqual([]);
    expect(await errors({ ratePhp: 25, turnaroundHours: 24 })).not.toEqual([]);
    expect(await errors({ ratePhp: 25, turnaroundHours: 24, active: 'yes' })).not.toEqual([]);
    expect(await errors({ ratePhp: 25, turnaroundHours: 24, active: true, shopId: 'sB' })).not.toEqual([]);
  });
});
