import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateShopInviteDto } from './shop-staff.dto';

async function errors(body: unknown): Promise<string[]> {
  const errs = await validate(plainToInstance(CreateShopInviteDto, body), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errs.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('CreateShopInviteDto', () => {
  it('accepts an email', async () => {
    expect(await errors({ email: 'Staff@Example.com' })).toEqual([]);
  });

  it.each([{}, { email: 'not-an-email' }, { email: `${'a'.repeat(250)}@x.co` }, { email: 'a@b.co', role: 'OWNER' }, { email: 'a@b.co', shopId: 's' }])(
    'rejects %p',
    async (body) => {
      expect(await errors(body)).not.toEqual([]);
    },
  );
});
