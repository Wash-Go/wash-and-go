import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { RemittanceModule } from '../remittance/remittance.module';
import { ShopAccessService } from './shop-access.service';
import { ShopsModule } from './shops.module';

// One ShopAccessService for every /shop/* consumer: ShopsModule owns and
// exports it; RemittanceModule imports ShopsModule instead of re-providing it.
describe('ShopAccessService wiring', () => {
  const meta = (m: object, key: string) => (Reflect.getMetadata(key, m) ?? []) as unknown[];

  it('ShopsModule provides and exports ShopAccessService', () => {
    expect(meta(ShopsModule, MODULE_METADATA.PROVIDERS)).toContain(ShopAccessService);
    expect(meta(ShopsModule, MODULE_METADATA.EXPORTS)).toContain(ShopAccessService);
  });

  it('RemittanceModule imports ShopsModule and does not re-provide it', () => {
    expect(meta(RemittanceModule, MODULE_METADATA.IMPORTS)).toContain(ShopsModule);
    expect(meta(RemittanceModule, MODULE_METADATA.PROVIDERS)).not.toContain(ShopAccessService);
  });
});
