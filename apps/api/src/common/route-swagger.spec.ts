import 'reflect-metadata';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ShopRemittanceController } from '../remittance/shop-remittance.controller';
import { ShopInvitesController } from '../shops/shop-invite-acceptance.controller';
import { ShopOnboardingController } from '../shops/shop-onboarding.controller';
import { ShopPayoutController } from '../shops/shop-payout.controller';
import { ShopProfileController } from '../shops/shop-profile.controller';
import { ShopServicesController } from '../shops/shop-services.controller';
import { ShopStaffController } from '../shops/shop-staff.controller';
import { UploadsController } from '../uploads/uploads.controller';

/*
 * Every owner/staff /shop/* route (and /uploads/status) documents its success
 * response: a 2xx entry with a schema class, or a 204 for routes with no body.
 * A new route without one fails here instead of shipping an empty Swagger op.
 */
type Responses = Record<string, { type?: unknown; isArray?: boolean }>;

function responses(ctrl: { prototype: object }, method: string): Responses {
  const handler = (ctrl.prototype as Record<string, unknown>)[method];
  return (Reflect.getMetadata(DECORATORS.API_RESPONSE, handler as object) ?? {}) as Responses;
}

const WITH_BODY: Array<[{ prototype: object; name: string }, string, string, boolean]> = [
  // [controller, method, status, isArray]
  [ShopServicesController, 'catalog', '200', true],
  [ShopServicesController, 'list', '200', true],
  [ShopServicesController, 'upsert', '200', false],
  [ShopProfileController, 'get', '200', false],
  [ShopProfileController, 'update', '200', false],
  [ShopPayoutController, 'put', '200', false],
  [ShopStaffController, 'members', '200', true],
  [ShopStaffController, 'invites', '200', true],
  [ShopStaffController, 'invite', '201', false],
  [ShopInvitesController, 'pending', '200', true],
  [ShopInvitesController, 'accept', '200', false],
  [ShopOnboardingController, 'mine', '200', false],
  [ShopOnboardingController, 'start', '201', false],
  [ShopOnboardingController, 'update', '200', false],
  [ShopOnboardingController, 'submit', '201', false],
  [UploadsController, 'status', '200', false],
  [ShopRemittanceController, 'batches', '200', true],
  [ShopRemittanceController, 'pending', '200', false],
  [ShopRemittanceController, 'batch', '200', false],
];

const NO_BODY: Array<[{ prototype: object; name: string }, string]> = [
  [ShopPayoutController, 'remove'],
  [ShopStaffController, 'removeMember'],
  [ShopStaffController, 'revoke'],
];

describe('Swagger responses on /shop/* routes', () => {
  it.each(WITH_BODY)(
    '%p.%s documents a %s response with a schema',
    (ctrl, method, status, isArray) => {
      const r = responses(ctrl, method)[status];
      expect(r).toBeDefined();
      expect(typeof r.type).toBe('function');
      expect(Boolean(r.isArray)).toBe(isArray);
    },
  );

  it.each(NO_BODY)('%p.%s documents a 204', (ctrl, method) => {
    expect(responses(ctrl, method)['204']).toBeDefined();
  });
});
