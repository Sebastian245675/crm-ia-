import { ForbiddenException } from '@nestjs/common';
import { AgencyPermissionGuard } from './agency-permission.guard';

const contextFor = (user: any, table_name?: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ user, params: { table_name } }) }),
  getHandler: () => function handler() {},
  getClass: () => class Controller {},
}) as any;

describe('AgencyPermissionGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const db = { query: jest.fn() };
  const authService = { verifyToken: jest.fn() };
  const guard = new AgencyPermissionGuard(reflector as any, db as any, authService as any);

  beforeEach(() => jest.clearAllMocks());

  it('allows the agency owner regardless of collaborator permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue('manageOrders');
    db.query.mockResolvedValue([{ id: 1, account_role: 'agency_owner', active: true, permissions: '{}' }]);
    await expect(guard.canActivate(contextFor({ sub: 1 }))).resolves.toBe(true);
  });

  it('allows a collaborator only when the required permission is enabled', async () => {
    reflector.getAllAndOverride.mockReturnValue('manageOrders');
    db.query.mockResolvedValue([{
      id: 2,
      account_role: 'agency_user',
      active: true,
      permissions: JSON.stringify({ manageOrders: true }),
    }]);
    await expect(guard.canActivate(contextFor({ sub: 2 }))).resolves.toBe(true);
  });

  it('rejects a collaborator without the required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue('viewAccounting');
    db.query.mockResolvedValue([{
      id: 2,
      account_role: 'agency_user',
      active: true,
      permissions: JSON.stringify({ viewAccounting: false }),
    }]);
    await expect(guard.canActivate(contextFor({ sub: 2 }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps generic document writes to their module permission', async () => {
    reflector.getAllAndOverride.mockReturnValue('table');
    db.query.mockResolvedValue([{
      id: 2,
      account_role: 'agency_user',
      active: true,
      permissions: JSON.stringify({ manageProducts: true }),
    }]);
    await expect(guard.canActivate(contextFor({ sub: 2 }, 'categories'))).resolves.toBe(true);
  });
});
