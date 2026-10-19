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
describe('PutShopServiceDto', () => {
  it('accepts a rate, turnaround and optional active flag', async () => {
    expect(await errors({ ratePhp: 25, turnaroundHours: 24 })).toEqual([]);
    expect(await errors({ ratePhp: 0.5, turnaroundHours: 1, active: false })).toEqual([]);
  });

  it.each([0, -1, 'abc'])('rejects ratePhp %p', async (ratePhp) => {
    expect(await errors({ ratePhp, turnaroundHours: 24 })).not.toEqual([]);
  });

  it.each([0, 1.5, -2])('rejects turnaroundHours %p', async (turnaroundHours) => {
    expect(await errors({ ratePhp: 25, turnaroundHours })).not.toEqual([]);
  });

  it('requires rate and turnaround, rejects unknown fields', async () => {
    expect(await errors({ turnaroundHours: 24 })).not.toEqual([]);
    expect(await errors({ ratePhp: 25 })).not.toEqual([]);
    expect(await errors({ ratePhp: 25, turnaroundHours: 24, shopId: 'sB' })).not.toEqual([]);
  });
});
