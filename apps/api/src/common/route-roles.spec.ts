import 'reflect-metadata';
import { ROLES_KEY } from '../auth/roles.decorator';
import { AddressController } from '../users/address.controller';
import { OrdersController } from '../orders/orders.controller';
import { PlatformConfigController } from '../platform-config/platform-config.controller';
import { RemittanceController } from '../remittance/remittance.controller';
import { RidersController } from '../riders/riders.controller';
import { RiderCashController } from '../riders/rider-cash.controller';
import { ShopsController } from '../shops/shops.controller';

/*
 * B6: lock the coarse role matrix. RolesGuard reads @Roles metadata off each
 * handler; a wrong or missing decorator would ship silently (the guard just
 * lets any authenticated user through a route with no @Roles). This asserts the
 * exact expected roles per protected route, so a mis-scoped endpoint fails CI.
 *
 * `undefined` = intentionally any-authenticated (ownership-scoped in the service).
 */
function rolesOf(ctrl: object, method: string): string[] | undefined {
  return Reflect.getMetadata(ROLES_KEY, (ctrl as never)[method]);
}

describe('route role matrix', () => {
  it('orders controller routes carry the expected @Roles', () => {
    const c = OrdersController.prototype;
    expect(rolesOf(c, 'preview')).toEqual(['CUSTOMER']);
    expect(rolesOf(c, 'quote')).toEqual(['CUSTOMER']);
    expect(rolesOf(c, 'create')).toEqual(['CUSTOMER']);
    expect(rolesOf(c, 'assignRider')).toEqual(['ADMIN']);
    expect(rolesOf(c, 'weigh')).toEqual(['SHOP_OWNER', 'SHOP_STAFF']);
    expect(rolesOf(c, 'transition')).toEqual([
      'RIDER',
      'SHOP_OWNER',
      'SHOP_STAFF',
      'ADMIN',
    ]);
    expect(rolesOf(c, 'payCash')).toEqual(['ADMIN', 'RIDER']);
    // Any-authenticated + ownership-scoped in the service — deliberately no @Roles.
    expect(rolesOf(c, 'getOne')).toBeUndefined();
    expect(rolesOf(c, 'list')).toBeUndefined();
  });

  it('admin config routes are ADMIN-only', () => {
    const c = PlatformConfigController.prototype;
    expect(rolesOf(c, 'get')).toEqual(['ADMIN']);
    expect(rolesOf(c, 'update')).toEqual(['ADMIN']);
    expect(rolesOf(c, 'audit')).toEqual(['ADMIN']);
  });

  it('admin remittance routes are ADMIN-only', () => {
    const c = RemittanceController.prototype;
    expect(rolesOf(c, 'close')).toEqual(['ADMIN']);
    expect(rolesOf(c, 'list')).toEqual(['ADMIN']);
    expect(rolesOf(c, 'markPaid')).toEqual(['ADMIN']);
  });

  it('the riders picker is ADMIN-only', () => {
    expect(rolesOf(RidersController.prototype, 'list')).toEqual(['ADMIN']);
  });

  it('rider-cash reconciliation routes are ADMIN-only', () => {
    const c = RiderCashController.prototype;
    for (const m of ['summary', 'detail', 'deposit']) {
      expect(rolesOf(c, m)).toEqual(['ADMIN']);
    }
  });

  it('the shops catalog is CUSTOMER-scoped', () => {
    expect(rolesOf(ShopsController.prototype, 'list')).toEqual(['CUSTOMER']);
  });

  it('address-book routes are CUSTOMER-only', () => {
    const c = AddressController.prototype;
    for (const m of ['list', 'create', 'update', 'remove']) {
      expect(rolesOf(c, m)).toEqual(['CUSTOMER']);
    }
  });
});
