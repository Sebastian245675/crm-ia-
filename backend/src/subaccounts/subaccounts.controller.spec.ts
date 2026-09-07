import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { AuthController } from '../auth/auth.controller';
import { DatabaseService } from '../database/database.service';
import { SubaccountsController } from './subaccounts.controller';

describe('Subcuentas por agencia', () => {
  let db: DatabaseService;
  let controller: SubaccountsController;
  let authService: AuthService;
  let authController: AuthController;
  let tempDir: string;
  let ownerId: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merco-agency-'));
    process.env.DB_USE_SQLITE = 'true';
    process.env.DB_PATH = path.join(tempDir, 'agency-test.db');
    db = new DatabaseService();
    authService = new AuthService();
    authController = new AuthController(db, authService, { sendSecurityCode: jest.fn() } as any);
    controller = new SubaccountsController(db, authService);
    await db.onModuleInit();
    ownerId = String((await db.query('SELECT id FROM usuarios WHERE correo = %s', ['admin@gmail.com']))[0].id);
  });

  afterAll(async () => {
    await db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DB_PATH;
    delete process.env.DB_USE_SQLITE;
  });

  const requestFor = (id: string) => ({ user: { sub: id } } as any);

  it('solo el propietario crea colaboradores vinculados a su agencia y con permisos normalizados', async () => {
    const created = await controller.create(requestFor(ownerId), {
      name: 'Asesora Uno',
      email: 'asesora@agency.test',
      password: 'ClaveSegura123',
      permissions: { manageContacts: true, manageUsers: true, unknownPermission: true },
    });

    expect(created.data.agency_id).toBe(ownerId);
    expect(created.data.parent_user_id).toBe(ownerId);
    expect(created.data.permissions.manageContacts).toBe(true);
    expect(created.data.permissions.manageUsers).toBeUndefined();
    expect(created.data.permissions.unknownPermission).toBeUndefined();

    const stored = (await db.query('SELECT contraseña FROM usuarios WHERE id = %s', [created.data.id]))[0];
    expect(stored.contraseña).toMatch(/^scrypt\$/);
    expect(authService.verifyPassword('ClaveSegura123', stored.contraseña)).toBe(true);

    const loginResponse = { status: jest.fn().mockReturnThis(), json: jest.fn((value) => value) } as any;
    await authController.login({ email: 'asesora@agency.test', password: 'ClaveSegura123' }, loginResponse);
    expect(loginResponse.status).toHaveBeenCalledWith(200);
    expect(loginResponse.json.mock.calls[0][0].user.account_role).toBe('agency_user');
    expect(loginResponse.json.mock.calls[0][0].user.agency_id).toBe(ownerId);

    await expect(controller.list(requestFor(created.data.id))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lista, edita y elimina exclusivamente las subcuentas de la agencia autenticada', async () => {
    const list = await controller.list(requestFor(ownerId));
    const target = list.data.find((item) => item.email === 'asesora@agency.test');
    expect(target).toBeDefined();

    const updated = await controller.update(requestFor(ownerId), target.id, {
      name: 'Asesora Comercial',
      phone: '+57 300 000 0000',
      active: false,
      password: 'NuevaClave456',
      permissions: { manageOrders: true },
    });
    expect(updated.data.name).toBe('Asesora Comercial');
    expect(updated.data.active).toBe(false);
    expect(updated.data.permissions.manageOrders).toBe(true);
    const passwordRow = (await db.query('SELECT contraseña FROM usuarios WHERE id = %s', [target.id]))[0];
    expect(authService.verifyPassword('NuevaClave456', passwordRow.contraseña)).toBe(true);
    const blockedResponse = { status: jest.fn().mockReturnThis(), json: jest.fn((value) => value) } as any;
    await authController.login({ email: 'asesora@agency.test', password: 'NuevaClave456' }, blockedResponse);
    expect(blockedResponse.status).toHaveBeenCalledWith(403);

    const otherOwner = await db.query(
      `INSERT INTO usuarios
       (nombre, correo, contraseña, account_role, agency_id, permissions, active)
       VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id`,
      ['Otra agencia', 'owner2@agency.test', 'legacy', 'agency_owner', 'other-agency', '{}', true]
    );
    await expect(
      controller.update(requestFor(String(otherOwner[0].id)), target.id, {
        name: 'Intrusión', permissions: {}, active: true,
      })
    ).rejects.toBeInstanceOf(NotFoundException);

    await controller.remove(requestFor(ownerId), target.id);
    const remaining = await controller.list(requestFor(ownerId));
    expect(remaining.data.some((item) => item.id === target.id)).toBe(false);
  });
});
