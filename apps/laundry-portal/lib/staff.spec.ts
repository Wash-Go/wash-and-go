import { staffAccess } from './staff';

describe('staffAccess (shop-scoped role from GET /shop/me myRole)', () => {
  it('the shop owner manages invites and removes staff', () => {
    expect(staffAccess('OWNER')).toEqual({ known: true, manage: true });
  });
  it('staff see the team read-only, even if the account owns another shop globally', () => {
    expect(staffAccess('STAFF')).toEqual({ known: true, manage: false });
  });
  it('nothing is offered until the role is known', () => {
    expect(staffAccess(undefined)).toEqual({ known: false, manage: false });
  });
});
