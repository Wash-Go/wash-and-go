import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WeighDto } from './orders.dto';

// The global ValidationPipe (main.ts) runs exactly this: transform, then
// class-validator. A weigh body that fails here never reaches the service.
async function weighErrors(body: unknown): Promise<string[]> {
  const errors = await validate(plainToInstance(WeighDto, body));
  return errors.flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('WeighDto (U0 T3: the weigh-in sets the final bill)', () => {
  it.each([0.1, 6.4, 50])('accepts %p kg', async (weightKg) => {
    expect(await weighErrors({ weightKg })).toEqual([]);
  });

  it.each([0, -3, 50.01, 70, 100])('rejects %p kg', async (weightKg) => {
    expect(await weighErrors({ weightKg })).toContain(
      'Enter a weight above 0 kg and no more than 50 kg.',
    );
  });

  it('rejects a missing or non-numeric weight', async () => {
    expect(await weighErrors({})).not.toEqual([]);
    expect(await weighErrors({ weightKg: 'seventy' })).not.toEqual([]);
  });
});
