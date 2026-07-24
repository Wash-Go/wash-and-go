import 'reflect-metadata';
import { ROLES_KEY } from '../auth/roles.decorator';
import { AddressController } from '../users/address.controller';
import { AdminUsersController } from '../users/admin-users.controller';
import { OrdersController } from '../orders/orders.controller';
import { PlatformConfigController } from '../platform-config/platform-config.controller';
import { RemittanceController } from '../remittance/remittance.controller';
import { ShopRemittanceController } from '../remittance/shop-remittance.controller';
import { RidersController } from '../riders/riders.controller';
import { RiderCashController } from '../riders/rider-cash.controller';
import { ShopsController } from '../shops/shops.controller';
import { ZonesController } from '../zones/zones.controller';
import { GeocodeController } from '../maps/geocode.controller';

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
    expect(rolesOf(c, 'preview')).toEqual([
      'CUSTOMER',
      'SHOP_OWNER',
      'SHOP_STAFF',
      'ADMIN',
    ]);
    expect(rolesOf(c, 'quote')).toEqual(['CUSTOMER']);
    expect(rolesOf(c, 'create')).toEqual(['CUSTOMER']);
    expect(rolesOf(c, 'assignRider')).toEqual(['ADMIN']);
    expect(rolesOf(c, 'weigh')).toEqual(['SHOP_OWNER', 'SHOP_STAFF']);
    expect(rolesOf(c, 'transition')).toEqual([
      'CUSTOMER',
      'RIDER',
      'SHOP_OWNER',
      'SHOP_STAFF',
      'ADMIN',
    ]);
    expect(rolesOf(c, 'rate')).toEqual(['CUSTOMER']);
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

  it('zone admin routes are ADMIN-only', () => {
    const c = ZonesController.prototype;
    for (const m of ['list', 'create', 'setActive', 'resolve', 'remove']) {
      expect(rolesOf(c, m)).toEqual(['ADMIN']);
    }
  });

  it('geocode is any-authenticated (non-sensitive utility, no @Roles)', () => {
    expect(rolesOf(GeocodeController.prototype, 'geocode')).toBeUndefined();
  });

  it('the shops catalog is any-authenticated (non-sensitive, no @Roles)', () => {
    expect(rolesOf(ShopsController.prototype, 'list')).toBeUndefined();
  });

  it('address-book routes are CUSTOMER-only', () => {
    const c = AddressController.prototype;
    for (const m of ['list', 'create', 'update', 'remove']) {
      expect(rolesOf(c, m)).toEqual(['CUSTOMER']);
    }
  });

  it('admin user-management routes are ADMIN-only', () => {
    const c = AdminUsersController.prototype;
    for (const m of ['list', 'setRoles', 'disable', 'enable']) {
      expect(rolesOf(c, m)).toEqual(['ADMIN']);
    }
  });

  it('shop-facing remittance is SHOP_OWNER/STAFF only', () => {
    expect(rolesOf(ShopRemittanceController.prototype, 'batches')).toEqual([
      'SHOP_OWNER',
      'SHOP_STAFF',
    ]);
  });
});
