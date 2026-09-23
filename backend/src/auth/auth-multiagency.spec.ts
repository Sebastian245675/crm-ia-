import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { SubaccountsController } from '../subaccounts/subaccounts.controller';

describe('Multi-agencia y selector en login', () => {
  let db: DatabaseService;
  let authService: AuthService;
  let authController: AuthController;
  let subaccountsController: SubaccountsController;
  let tempDir: string;
  let ownerId: string;

  beforeAll(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merco-multiagency-'));
    process.env.DB_USE_SQLITE = 'true';
    process.env.DB_PATH = path.join(tempDir, 'multiagency-test.db');
    db = new DatabaseService();
    authService = new AuthService();
    authController = new AuthController(db, authService, { sendSecurityCode: jest.fn() } as any);
    subaccountsController = new SubaccountsController(db, authService);
    await db.onModuleInit();
    ownerId = String((await db.query('SELECT id FROM usuarios WHERE correo = %s', ['admin@gmail.com']))[0].id);
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

  it('un usuario con 1 sola agencia inicia sesion directamente sin selector', async () => {
    const res = response();
    await authController.login({ email: 'admin@gmail.com', password: 'admin123' }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.requireAgencySelection).toBeUndefined();
    expect(body.user).toBeDefined();
    expect(body.user.agency_id).toBe(ownerId);
    expect(body.user.access_token).toBeDefined();
  });

  it('un usuario vinculado a mas de una agencia recibe requireAgencySelection: true con la lista de agencias', async () => {
    // Creamos una segunda agencia
    const secondAgencyId = 'agency-segunda-test';
    await db.query(
      'INSERT INTO agencias (id, name, owner_id, plan, status) VALUES (%s, %s, %s, %s, %s)',
      [secondAgencyId, 'Segunda Agencia SA', '999', 'premium', 'active']
    );

    // Vinculamos al admin a esta segunda agencia
    await db.query(
      'INSERT INTO agencia_miembros (agency_id, user_id, role, permissions, active) VALUES (%s, %s, %s, %s, %s)',
      [secondAgencyId, ownerId, 'agency_user', JSON.stringify({ manageContacts: true }), 1]
    );

    const res = response();
    await authController.login({ email: 'admin@gmail.com', password: 'admin123' }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.requireAgencySelection).toBe(true);
    expect(body.tempToken).toBeDefined();
    expect(Array.isArray(body.agencies)).toBe(true);
    expect(body.agencies.length).toBe(2);

    const agencyIds = body.agencies.map((a: any) => a.id);
    expect(agencyIds).toContain(ownerId);
    expect(agencyIds).toContain(secondAgencyId);
  });

  it('permite seleccionar la agencia deseada con select-agency y emite sesion valida', async () => {
    const loginRes = response();
    await authController.login({ email: 'admin@gmail.com', password: 'admin123' }, loginRes);
    const tempToken = loginRes.json.mock.calls[0][0].tempToken;

    const selectRes = response();
    await authController.selectAgency({ tempToken, agencyId: 'agency-segunda-test' }, selectRes);

    expect(selectRes.status).toHaveBeenCalledWith(200);
    const body = selectRes.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.user.agency_id).toBe('agency-segunda-test');
    expect(body.user.account_role).toBe('agency_user');
    expect(body.user.permissions.manageContacts).toBe(true);
    expect(body.user.access_token).toBeDefined();

    // El token decodificado debe tener la agencia seleccionada
    const decoded = authService.verifyToken(body.user.access_token);
    expect(decoded.agency_id).toBe('agency-segunda-test');
  });

  it('permite cambiar de agencia activa con switch-agency', async () => {
    // Obtenemos token en la segunda agencia
    const loginRes = response();
    await authController.login({ email: 'admin@gmail.com', password: 'admin123' }, loginRes);
    const tempToken = loginRes.json.mock.calls[0][0].tempToken;

    const selectRes = response();
    await authController.selectAgency({ tempToken, agencyId: 'agency-segunda-test' }, selectRes);
    const currentToken = selectRes.json.mock.calls[0][0].user.access_token;

    // Cambiamos de nuevo a la agencia principal
    const switchReq = { user: { sub: ownerId }, headers: { authorization: `Bearer ${currentToken}` } } as any;
    const switchRes = response();
    await authController.switchAgency(switchReq, { agencyId: ownerId }, switchRes);

    expect(switchRes.status).toHaveBeenCalledWith(200);
    const body = switchRes.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.user.agency_id).toBe(ownerId);
    expect(body.user.account_role).toBe('agency_owner');
  });

  it('rechaza seleccionar una agencia a la cual el usuario no tiene acceso', async () => {
    const loginRes = response();
    await authController.login({ email: 'admin@gmail.com', password: 'admin123' }, loginRes);
    const tempToken = loginRes.json.mock.calls[0][0].tempToken;

    const selectRes = response();
    await authController.selectAgency({ tempToken, agencyId: 'agencia-ajena-999' }, selectRes);

    expect(selectRes.status).toHaveBeenCalledWith(403);
    expect(selectRes.json.mock.calls[0][0].success).toBe(false);
  });
});
