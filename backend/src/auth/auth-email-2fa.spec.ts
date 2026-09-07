import { AuthController } from './auth.controller';

describe('2FA por correo', () => {
  const response = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn((value) => value),
  } as any);

  it('envía el código al correo del usuario autenticado y no lo expone en la respuesta', async () => {
    const db = {
      query: jest.fn().mockImplementation((_sql: string, params: string[]) => {
        const users: Record<string, string> = {
          'user-1': 'propietario@empresa.test',
          'user-2': 'colaborador@empresa.test',
        };
        return Promise.resolve(users[params[0]] ? [{ correo: users[params[0]] }] : []);
      }),
    } as any;
    const authService = {
      verifyToken: jest.fn((token: string) => ({ sub: token === 'token-colaborador' ? 'user-2' : 'user-1' })),
    } as any;
    const emailsService = { sendSecurityCode: jest.fn().mockResolvedValue(undefined) } as any;
    const controller = new AuthController(db, authService, emailsService);

    const res = response();
    await controller.sendEmail2faCode('Bearer token-colaborador', res);

    expect(emailsService.sendSecurityCode).toHaveBeenCalledWith(
      'colaborador@empresa.test',
      expect.stringMatching(/^\d{6}$/),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0]).toEqual({
      success: true,
      message: 'Código enviado a colaborador@empresa.test',
      email: 'colaborador@empresa.test',
    });
    expect(res.json.mock.calls[0][0]).not.toHaveProperty('code');

    const ownerRes = response();
    await controller.sendEmail2faCode('Bearer token-propietario', ownerRes);
    expect(emailsService.sendSecurityCode).toHaveBeenLastCalledWith(
      'propietario@empresa.test',
      expect.stringMatching(/^\d{6}$/),
    );
  });
});
