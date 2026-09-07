import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

describe('Prueba gratuita por agencia', () => {
  let db: DatabaseService;
  let authService: AuthService;
  let controller: AuthController;
  let guard: JwtAuthGuard;
  let tempDir: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merco-trial-'));
    process.env.DB_USE_SQLITE = 'true';
    process.env.DB_PATH = path.join(tempDir, 'trial-test.db');
    db = new DatabaseService();
    authService = new AuthService();
    controller = new AuthController(db, authService, { sendSecurityCode: jest.fn() } as any);
    guard = new JwtAuthGuard(authService, db);
    await db.onModuleInit();
  });

  afterAll(async () => {
    await db.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DB_PATH;
    delete process.env.DB_USE_SQLITE;
  });

  const response = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn((value) => value),
  } as any);

  it('crea la agencia con exactamente 15 dias de prueba', async () => {
    const res = response();
    const before = Date.now();
    await controller.signup({
      name: 'Agencia Trial',
      email: 'trial@agency.test',
      password: 'ClaveSegura123',
      plan: 'trial',
    }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const user = res.json.mock.calls[0][0].user;
    expect(user.subscription.plan).toBe('free-trial');
    expect(user.subscription.status).toBe('trial');
    const duration = new Date(user.subscription.trial_ends_at).getTime() - before;
    expect(duration).toBeGreaterThanOrEqual(15 * 24 * 60 * 60 * 1000 - 2000);
    expect(duration).toBeLessThanOrEqual(15 * 24 * 60 * 60 * 1000 + 2000);
  });

  it('bloquea una sesion abierta y desactiva toda la agencia al vencer', async () => {
    const owner = (await db.query('SELECT id FROM usuarios WHERE correo = %s', ['trial@agency.test']))[0];
    const ownerId = String(owner.id);
    const loginRes = response();
    await controller.login({ email: 'trial@agency.test', password: 'ClaveSegura123' }, loginRes);
    const token = loginRes.json.mock.calls[0][0].user.access_token;

    const columns = await db.query('PRAGMA table_info(usuarios)');
    const passwordColumn = String(columns.find((column) => String(column.name).startsWith('contra'))?.name);
    await db.query(
      `INSERT INTO usuarios (nombre, correo, "${passwordColumn}", sub_cuenta, account_role, agency_id, parent_user_id, permissions, active) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)`,
      ['Colaborador', 'colaborador@agency.test', 'sin-acceso', 'si', 'agency_user', ownerId, ownerId, '{}', 1]
    );
    await db.query(
      'UPDATE suscripciones SET trial_ends_at = %s WHERE user_id = %s AND status = %s',
      [new Date(Date.now() - 1000).toISOString(), ownerId, 'trial']
    );

    const request = { headers: { authorization: `Bearer ${token}` }, query: {} };
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as any;
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);

    const subscription = (await db.query('SELECT status FROM suscripciones WHERE user_id = %s', [ownerId]))[0];
    expect(subscription.status).toBe('expired');
    const users = await db.query('SELECT active FROM usuarios WHERE id = %s OR agency_id = %s', [ownerId, ownerId]);
    expect(users.every((user) => user.active === 0 || user.active === false)).toBe(true);
  });
});
