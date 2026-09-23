import { Controller, Post, Get, Body, Res, Req, Headers, HttpStatus, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import * as express from 'express';
import { generateSecret, verifyTOTP } from './totp.helper';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EmailsService } from '../emails/emails.service';

const email2faCodes = new Map<string, { code: string; expiresAt: number }>();

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
    private readonly emailsService: EmailsService,
  ) {}

  private parsePermissions(value: unknown): Record<string, boolean> {
    if (!value) return {};
    if (typeof value === 'object') return value as Record<string, boolean>;
    try {
      const parsed = JSON.parse(String(value));
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  private async getUserAgencies(userId: string): Promise<Array<{ id: string; name: string; role: string; logo?: string; plan?: string }>> {
    const rows = await this.db.query(
      `SELECT m.agency_id, m.role, m.permissions, m.active, a.name, a.logo, a.plan
       FROM agencia_miembros m
       LEFT JOIN agencias a ON a.id = m.agency_id
       WHERE m.user_id = %s AND (m.active = true OR m.active IS TRUE)
       ORDER BY m.created_at ASC`,
      [String(userId)]
    );

    const result: Array<{ id: string; name: string; role: string; logo?: string; plan?: string }> = [];

    if (!rows.length) {
      const userRows = await this.db.query(
        'SELECT id, nombre, account_role, agency_id FROM usuarios WHERE id = %s',
        [String(userId)]
      );
      if (userRows.length) {
        const u = userRows[0];
        const aId = String(u.agency_id || u.id);
        result.push({
          id: aId,
          name: u.nombre ? `${u.nombre}` : 'Mi Agencia',
          role: u.account_role || 'agency_owner',
          logo: '',
          plan: 'basic',
        });
      }
    } else {
      for (const r of rows) {
        result.push({
          id: String(r.agency_id),
          name: r.name || 'Mi Agencia',
          role: r.role || 'agency_user',
          logo: r.logo || '',
          plan: r.plan || 'basic',
        });
      }
    }

    for (const item of result) {
      try {
        const docRows = await this.db.query(
          "SELECT datos FROM documentos WHERE tabla_nombre = 'company_profile' AND (id = %s OR id LIKE %s) LIMIT 1",
          [item.id, `%${item.id}%`]
        );
        if (docRows.length) {
          const profile = JSON.parse(docRows[0].datos);
          if (profile.friendly_name || profile.friendlyName) {
            item.name = profile.friendly_name || profile.friendlyName;
          }
          if (profile.logo) {
            item.logo = profile.logo;
          }
        }
      } catch (_) {}
    }

    return result;
  }

  private async buildUserWithAgency(user: any, subscription: any, activeAgencyId?: string, userAgencies?: any[]) {
    const effectiveAgencyId = activeAgencyId ? String(activeAgencyId) : (user.agency_id ? String(user.agency_id) : String(user.id));
    let role = user.account_role || (user.sub_cuenta === 'si' ? 'agency_user' : user.sub_cuenta === 'saas-admin' ? 'saas_admin' : 'agency_owner');
    let permissions = this.parsePermissions(user.permissions);

    if (activeAgencyId) {
      try {
        const memRows = await this.db.query(
          'SELECT role, permissions FROM agencia_miembros WHERE user_id = %s AND agency_id = %s LIMIT 1',
          [String(user.id), effectiveAgencyId]
        );
        if (memRows.length) {
          role = memRows[0].role || role;
          if (memRows[0].permissions) {
            permissions = this.parsePermissions(memRows[0].permissions);
          }
        }
      } catch (_) {}
    }

    const agencies = userAgencies || await this.getUserAgencies(String(user.id));

    const userResponse = {
      id: String(user.id),
      name: user.nombre || user.name || user.email,
      email: user.correo || user.email,
      sub_cuenta: user.sub_cuenta ?? null,
      liberta: user.liberta ?? 'no',
      account_role: role,
      agency_id: effectiveAgencyId,
      parent_user_id: user.parent_user_id ? String(user.parent_user_id) : null,
      permissions,
      active: user.active === undefined || user.active === null || user.active === true || user.active === 1,
      subscription: subscription || {
        plan: 'basic',
        plan_display_name: 'Plan básico',
        status: 'active',
        is_demo: false,
        trial_ends_at: null,
      },
      agencies,
    };

    const token = this.authService.signToken({
      sub: userResponse.id,
      email: userResponse.email,
      name: userResponse.name,
      plan: userResponse.subscription.plan,
      plan_status: userResponse.subscription.status,
      account_role: userResponse.account_role,
      agency_id: userResponse.agency_id,
      permissions: userResponse.permissions,
    });

    return {
      ...userResponse,
      access_token: token,
      token_type: 'bearer',
      expires_in: 60 * 60 * 24,
    };
  }

  private buildUserResponse(user: any, subscription: any, activeAgencyId?: string, userAgencies?: any[]) {
    return this.buildUserWithAgency(user, subscription, activeAgencyId, userAgencies);
  }

  private planDisplayName(plan: string) {
    if (plan === 'deluxe-ilimitado-websy') return 'free merco';
    if (plan === 'free-trial') return 'Free Trial';
    if (plan === 'basic') return 'Plan básico';
    if (plan === 'premium') return 'Plan premium';
    if (plan === 'free') return 'Plan gratuito';
    if (plan === 'base') return 'Plan base';
    if (plan === 'intermediate') return 'Plan intermedio';
    if (plan === 'advanced') return 'Plan avanzado';
    return plan;
  }

  private isDemoAccount(email: string) {
    const normalized = String(email || '').toLowerCase();
    return normalized.includes('demo') || normalized === 'demo@websy.com' || normalized === 'demo@tienda.com';
  }

  private getTrialEndDate(days: number) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return expires.toISOString();
  }

  private getSubscriptionOwnerId(user: any) {
    return String(
      user.account_role === 'agency_user' || user.sub_cuenta === 'si'
        ? (user.agency_id || user.parent_user_id || user.id)
        : user.id
    );
  }

  private isInfiniteAgency(agencyId?: string) {
    const normalized = String(agencyId || '').trim().toLowerCase().replace(/_/g, '-');
    return normalized === 'voltium' || normalized === 'voltium-sanrey';
  }

  private trialHasExpired(subscription: any, agencyId?: string) {
    if (this.isInfiniteAgency(agencyId)) return false;
    if (subscription?.status === 'expired') return true;
    if (subscription?.status !== 'trial' || !subscription?.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at).getTime() <= Date.now();
  }

  private async expireTrial(user: any, subscription: any, agencyId?: string) {
    if (!this.trialHasExpired(subscription, agencyId)) return subscription;

    const ownerId = this.getSubscriptionOwnerId(user);
    if (subscription.status === 'trial') {
      await this.db.query(
        'UPDATE suscripciones SET status = %s, updated_at = NOW() WHERE user_id = %s AND status = %s',
        ['expired', ownerId, 'trial']
      );
    }
    await this.db.query(
      'UPDATE usuarios SET active = %s, updated_at = NOW() WHERE id = %s OR agency_id = %s',
      [0, ownerId, ownerId]
    );
    return { ...subscription, status: 'expired', updated_at: new Date().toISOString() };
  }

  private trialExpiredResponse(res: express.Response) {
    return res.status(HttpStatus.FORBIDDEN).json({
      success: false,
      code: 'TRIAL_EXPIRED',
      message: 'Tu periodo de prueba de 15 dias finalizo. Contrata un plan para reactivar tu cuenta.',
    });
  }

  private async getSubscriptionForUser(userId: string) {
    const rows = await this.db.query(
      'SELECT plan, status, trial_ends_at, is_demo, created_at, updated_at FROM suscripciones WHERE user_id = %s ORDER BY created_at DESC LIMIT 1',
      [String(userId)]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      plan: row.plan || 'basic',
      plan_display_name: this.planDisplayName(row.plan || 'basic'),
      status: row.status || 'active',
      is_demo: row.is_demo === 1 || row.is_demo === true,
      trial_ends_at: row.trial_ends_at || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || row.created_at || null,
    };
  }

  private async createSubscription(userId: string, plan: string, status: string, isDemo: boolean, trialDays: number | null) {
    const trialEndsAt = trialDays ? this.getTrialEndDate(trialDays) : null;
    await this.db.query(
      'INSERT INTO suscripciones (user_id, plan, status, is_demo, trial_ends_at, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
      [String(userId), plan, status, isDemo ? 1 : 0, trialEndsAt]
    );
    return {
      plan,
      plan_display_name: this.planDisplayName(plan),
      status,
      is_demo: isDemo,
      trial_ends_at: trialEndsAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: express.Request, @Res() res: express.Response) {
    const userId = String((request as any).user?.sub || '');
    const activeAgencyFromToken = (request as any).user?.agency_id ? String((request as any).user.agency_id) : undefined;
    const rows = await this.db.query(
      'SELECT id, nombre, correo, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active FROM usuarios WHERE id = %s',
      [userId]
    );
    if (!rows.length) return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Usuario no encontrado.' });
    const user = rows[0];
    const isActive = user.active === undefined || user.active === null || user.active === true || user.active === 1;
    if (!isActive) return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'La cuenta está desactivada.' });
    const subscription = await this.resolveSubscription(user, activeAgencyFromToken);
    const userAgencies = await this.getUserAgencies(userId);
    const userResponse = await this.buildUserWithAgency(user, subscription, activeAgencyFromToken, userAgencies);
    return res.status(HttpStatus.OK).json({ success: true, user: userResponse });
  }

  private async resolveSubscription(user: any, agencyId?: string) {
    const subscriptionOwnerId = this.getSubscriptionOwnerId(user);
    const existing = await this.getSubscriptionForUser(subscriptionOwnerId);
    if (existing) {
      return await this.expireTrial(user, existing, agencyId);
    }

    const email = String(user.correo || user.email || '').toLowerCase();
    const isDemo = this.isDemoAccount(email);
    if (isDemo) {
      return await this.createSubscription(subscriptionOwnerId, 'deluxe-ilimitado-websy', 'trial', true, 15);
    }

    return await this.createSubscription(subscriptionOwnerId, 'basic', 'active', false, null);
  }

  @Post('login')
  async login(@Body() body: any, @Res() res: express.Response) {
    try {
      const email = body.email || body.correo;
      const password = body.password || body.contrasena || body.contraseña;

      if (!email || !password) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Email y contraseña son obligatorios',
        });
      }

      const lowEmail = String(email).toLowerCase();

      const rows = await this.db.query(
        'SELECT id, nombre, correo, contraseña, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active, totp_secret, email_2fa_enabled, backup_codes FROM usuarios WHERE correo = %s',
        [lowEmail]
      );

      if (rows.length > 0) {
        const user = rows[0];
        const passDb = user.contraseña;
        const isActive = user.active === undefined || user.active === null || user.active === true || user.active === 1;
        if (!isActive) {
          return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'Esta cuenta fue desactivada por la agencia.' });
        }

        const match = this.authService.verifyPassword(String(password), String(passDb));

        if (match) {
          if (!String(passDb).startsWith('scrypt$')) {
            await this.db.query('UPDATE usuarios SET contraseña = %s, updated_at = NOW() WHERE id = %s', [
              this.authService.hashPassword(String(password)),
              String(user.id)
            ]);
          }
          const subscription = await this.resolveSubscription(user);
          if (this.trialHasExpired(subscription)) return this.trialExpiredResponse(res);

          const hasTotp = !!user.totp_secret;
          const hasEmail2fa = user.email_2fa_enabled === 1 || user.email_2fa_enabled === true;

          if (hasTotp || hasEmail2fa) {
            // If email 2FA is preferred or TOTP is not set, generate email OTP
            let method = hasTotp ? 'totp' : 'email';
            if (hasEmail2fa && !hasTotp) {
              const otp = Math.floor(100000 + Math.random() * 900000).toString();
              await this.emailsService.sendSecurityCode(user.correo, otp);
              email2faCodes.set(String(user.id), { code: otp, expiresAt: Date.now() + 10 * 60 * 1000 });
            }

            const tempToken = this.authService.signToken({
              sub: String(user.id),
              email: user.correo,
              isTemp2fa: true,
            });
            return res.status(HttpStatus.OK).json({
              success: true,
              require2fa: true,
              tempToken,
              method,
              email: user.correo,
            });
          }

          const userAgencies = await this.getUserAgencies(String(user.id));
          if (userAgencies.length > 1) {
            const agencyTempToken = this.authService.signToken({
              sub: String(user.id),
              email: user.correo,
              isTempAgencySelection: true,
            });
            return res.status(HttpStatus.OK).json({
              success: true,
              requireAgencySelection: true,
              tempToken: agencyTempToken,
              agencies: userAgencies,
            });
          }

          const activeAgencyId = userAgencies[0]?.id || String(user.agency_id || user.id);
          const userResponse = await this.buildUserWithAgency(user, subscription, activeAgencyId, userAgencies);

          return res.status(HttpStatus.OK).json({
            success: true,
            user: userResponse,
          });
        }
      }

      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Credenciales incorrectas',
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error en el servidor: ${e.message}`,
      });
    }
  }

  @Post('signup')
  async signup(@Body() body: any, @Res() res: express.Response) {
    try {
      const nombre = body.name || body.nombre;
      const correo = body.email || body.correo;
      const contraseña = body.password || body.contraseña || body.contrasena;

      if (!nombre || !correo || !contraseña) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Nombre, email y contraseña son obligatorios',
        });
      }
      if (String(contraseña).length < 8) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'La contraseña debe tener al menos 8 caracteres',
        });
      }

      const lowEmail = String(correo).toLowerCase();
      const rows = await this.db.query('SELECT id FROM usuarios WHERE correo = %s', [lowEmail]);
      if (rows.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'El correo ya está registrado',
        });
      }

      const insertResult = await this.db.query(
        'INSERT INTO usuarios (nombre, correo, contraseña, sub_cuenta, liberta, account_role, permissions, active) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
        [nombre, lowEmail, this.authService.hashPassword(String(contraseña)), null, 'no', 'agency_owner', '{}', 1]
      );

      const nuevoId = insertResult[0]?.id || null;
      await this.db.query('UPDATE usuarios SET agency_id = %s, updated_at = NOW() WHERE id = %s', [String(nuevoId), String(nuevoId)]);

      await this.db.query(
        'INSERT INTO agencias (id, name, owner_id, plan, status, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
        [String(nuevoId), nombre, String(nuevoId), 'basic', 'active']
      );
      await this.db.query(
        'INSERT INTO agencia_miembros (agency_id, user_id, role, permissions, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
        [String(nuevoId), nuevoId, 'agency_owner', '{}', 1]
      );

      const user = {
        id: nuevoId,
        nombre,
        correo: lowEmail,
        sub_cuenta: null,
        liberta: 'no',
        account_role: 'agency_owner',
        agency_id: String(nuevoId),
        permissions: '{}',
        active: true,
      };
      const plan = body.plan || 'free';
      let dbPlan = plan;
      if (plan === 'trial') dbPlan = 'free-trial';
      if (plan === 'free') dbPlan = 'free';
      if (plan === 'base') dbPlan = 'base';
      if (plan === 'intermediate') dbPlan = 'intermediate';
      if (plan === 'advanced') dbPlan = 'advanced';

      const trialDays = dbPlan === 'free' ? null : 15;
      const status = dbPlan === 'free' ? 'active' : 'trial';

      const subscription = await this.createSubscription(nuevoId, dbPlan, status, false, trialDays);
      const userAgencies = await this.getUserAgencies(String(nuevoId));
      const userResponse = await this.buildUserWithAgency(user, subscription, String(nuevoId), userAgencies);

      return res.status(HttpStatus.OK).json({
        success: true,
        user: userResponse,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error en el servidor: ${e.message}`,
      });
    }
  }

  @Post('google')
  async googleLogin(@Body() body: any, @Res() res: express.Response) {
    try {
      const { token } = body;
      if (!token) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Falta el token de Google' });
      }

      const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!googleRes.ok) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Token de Google inválido' });
      }
      
      const googleUser = await googleRes.json();
      const email = googleUser.email;
      const name = googleUser.name;
      
      if (!email) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'El perfil de Google no tiene email' });
      }

      const lowEmail = String(email).toLowerCase();

      let rows = await this.db.query(
        'SELECT id, nombre, correo, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active FROM usuarios WHERE correo = %s',
        [lowEmail]
      );
      
      let user;
      if (rows.length > 0) {
        user = rows[0];
        const isActive = user.active === undefined || user.active === null || user.active === true || user.active === 1;
        if (!isActive) {
          return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'Esta cuenta está desactivada por la agencia.' });
        }
      } else {
        const insertResult = await this.db.query(
          'INSERT INTO usuarios (nombre, correo, contraseña, sub_cuenta, liberta, account_role, permissions, active) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id',
          [name, lowEmail, '', null, 'no', 'agency_owner', '{}', 1]
        );
        const newUserId = insertResult[0]?.id;
        await this.db.query('UPDATE usuarios SET agency_id = %s, updated_at = NOW() WHERE id = %s', [String(newUserId), String(newUserId)]);
        await this.db.query(
          'INSERT INTO agencias (id, name, owner_id, plan, status, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
          [String(newUserId), name, String(newUserId), 'basic', 'active']
        );
        await this.db.query(
          'INSERT INTO agencia_miembros (agency_id, user_id, role, permissions, active, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, NOW(), NOW())',
          [String(newUserId), newUserId, 'agency_owner', '{}', 1]
        );
        user = {
          id: newUserId,
          nombre: name,
          correo: lowEmail,
          sub_cuenta: null,
          liberta: 'no',
          account_role: 'agency_owner',
          agency_id: String(newUserId),
          permissions: '{}',
          active: true,
        };
      }

      const subscription = await this.resolveSubscription(user);
      if (this.trialHasExpired(subscription)) return this.trialExpiredResponse(res);

      const userAgencies = await this.getUserAgencies(String(user.id));
      if (userAgencies.length > 1) {
        const agencyTempToken = this.authService.signToken({
          sub: String(user.id),
          email: user.correo,
          isTempAgencySelection: true,
        });
        return res.status(HttpStatus.OK).json({
          success: true,
          requireAgencySelection: true,
          tempToken: agencyTempToken,
          agencies: userAgencies,
        });
      }

      const activeAgencyId = userAgencies[0]?.id || String(user.agency_id || user.id);
      const userResp = await this.buildUserWithAgency(user, subscription, activeAgencyId, userAgencies);
      return res.status(HttpStatus.OK).json({
        success: true,
        user: userResp,
      });

    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error en el servidor: ${e.message}`,
      });
    }
  }

  @Post('login/2fa')
  async login2fa(@Body() body: any, @Res() res: express.Response) {
    try {
      const { tempToken, code } = body;
      if (!tempToken || !code) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Token temporal y código 2FA requeridos' });
      }

      const payload = this.authService.verifyToken(tempToken);
      if (!payload || !payload.isTemp2fa) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Sesión de login de prueba expirada o inválida' });
      }

      const userId = payload.sub;
      const rows = await this.db.query(
        'SELECT id, nombre, correo, contraseña, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active, totp_secret, email_2fa_enabled, backup_codes FROM usuarios WHERE id = %s',
        [String(userId)]
      );

      if (rows.length === 0) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Usuario no encontrado' });
      }

      const user = rows[0];
      const isActive = user.active === undefined || user.active === null || user.active === true || user.active === 1;
      if (!isActive) {
        return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'Esta cuenta está desactivada por la agencia.' });
      }

      let isValid = false;
      const cleanCode = String(code).trim();

      // 1. Validar TOTP (Google Authenticator) si está configurado
      if (user.totp_secret && verifyTOTP(user.totp_secret, cleanCode)) {
        isValid = true;
      }

      // 2. Validar Código de Correo (Email OTP)
      if (!isValid) {
        const emailEntry = email2faCodes.get(String(userId));
        if (emailEntry && emailEntry.code === cleanCode && emailEntry.expiresAt > Date.now()) {
          isValid = true;
          email2faCodes.delete(String(userId));
        }
      }

      // 3. Validar Códigos de Respaldo de Emergencia (Backup Codes)
      if (!isValid && user.backup_codes) {
        try {
          const codes: string[] = JSON.parse(user.backup_codes);
          const normalized = cleanCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const matchIdx = codes.findIndex(c => c.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === normalized);
          if (matchIdx !== -1) {
            isValid = true;
            codes.splice(matchIdx, 1);
            await this.db.query('UPDATE usuarios SET backup_codes = %s WHERE id = %s', [
              JSON.stringify(codes),
              String(userId)
            ]);
          }
        } catch (_) {}
      }

      if (!isValid) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Código de seguridad incorrecto o expirado' });
      }

      const subscription = await this.resolveSubscription(user);
      if (this.trialHasExpired(subscription)) return this.trialExpiredResponse(res);

      const userAgencies = await this.getUserAgencies(String(user.id));
      if (userAgencies.length > 1) {
        const agencyTempToken = this.authService.signToken({
          sub: String(user.id),
          email: user.correo,
          isTempAgencySelection: true,
        });
        return res.status(HttpStatus.OK).json({
          success: true,
          requireAgencySelection: true,
          tempToken: agencyTempToken,
          agencies: userAgencies,
        });
      }

      const activeAgencyId = userAgencies[0]?.id || String(user.agency_id || user.id);
      const userResponse = await this.buildUserWithAgency(user, subscription, activeAgencyId, userAgencies);
      return res.status(HttpStatus.OK).json({
        success: true,
        user: userResponse,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al validar 2FA: ${e.message}`,
      });
    }
  }

  @Post('select-agency')
  async selectAgency(@Body() body: any, @Res() res: express.Response) {
    try {
      const { tempToken, agencyId } = body;
      if (!tempToken || !agencyId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'tempToken y agencyId son obligatorios',
        });
      }

      let payload: any;
      try {
        payload = this.authService.verifyToken(tempToken);
      } catch (_) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Sesión temporal de selección expirada o inválida',
        });
      }

      if (!payload || (!payload.isTempAgencySelection && !payload.isTemp2fa && !payload.sub)) {
        return res.status(HttpStatus.UNAUTHORIZED).json({
          success: false,
          message: 'Token de selección no válido',
        });
      }

      const userId = String(payload.sub);
      const userRows = await this.db.query(
        'SELECT id, nombre, correo, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active FROM usuarios WHERE id = %s',
        [userId]
      );
      if (!userRows.length) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Usuario no encontrado' });
      }

      const user = userRows[0];
      const isActive = user.active === undefined || user.active === null || user.active === true || user.active === 1;
      if (!isActive) {
        return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'La cuenta está desactivada.' });
      }

      const members = await this.db.query(
        'SELECT agency_id, role, permissions, active FROM agencia_miembros WHERE user_id = %s AND agency_id = %s',
        [userId, String(agencyId)]
      );

      if (!members.length && String(user.agency_id) !== String(agencyId) && String(user.id) !== String(agencyId)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'No tienes acceso a la agencia seleccionada',
        });
      }

      const membership = members[0];
      if (membership && (membership.active === 0 || membership.active === false)) {
        return res.status(HttpStatus.FORBIDDEN).json({
          success: false,
          message: 'Tu acceso a esta agencia está suspendido.',
        });
      }

      const userAgencies = await this.getUserAgencies(userId);
      const subscription = await this.resolveSubscription(user, String(agencyId));
      if (this.trialHasExpired(subscription, String(agencyId))) return this.trialExpiredResponse(res);

      const userResponse = await this.buildUserWithAgency(user, subscription, String(agencyId), userAgencies);
      return res.status(HttpStatus.OK).json({
        success: true,
        user: userResponse,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al seleccionar agencia: ${e.message}`,
      });
    }
  }

  @Post('switch-agency')
  @UseGuards(JwtAuthGuard)
  async switchAgency(@Req() request: express.Request, @Body() body: any, @Res() res: express.Response) {
    try {
      const userId = String((request as any).user?.sub || '');
      const { agencyId } = body;
      if (!agencyId) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'agencyId es requerido' });
      }

      const userRows = await this.db.query(
        'SELECT id, nombre, correo, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active FROM usuarios WHERE id = %s',
        [userId]
      );
      if (!userRows.length) return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Usuario no encontrado' });

      const user = userRows[0];
      const members = await this.db.query(
        'SELECT agency_id, role, permissions, active FROM agencia_miembros WHERE user_id = %s AND agency_id = %s',
        [userId, String(agencyId)]
      );

      if (!members.length && String(user.agency_id) !== String(agencyId) && String(user.id) !== String(agencyId)) {
        return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'No tienes acceso a la agencia seleccionada' });
      }

      const membership = members[0];
      if (membership && (membership.active === 0 || membership.active === false)) {
        return res.status(HttpStatus.FORBIDDEN).json({ success: false, message: 'Tu acceso a esta agencia está suspendido.' });
      }

      const userAgencies = await this.getUserAgencies(userId);
      const subscription = await this.resolveSubscription(user, String(agencyId));
      if (this.trialHasExpired(subscription, String(agencyId))) return this.trialExpiredResponse(res);

      const userResponse = await this.buildUserWithAgency(user, subscription, String(agencyId), userAgencies);
      return res.status(HttpStatus.OK).json({
        success: true,
        user: userResponse,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al cambiar agencia: ${e.message}`,
      });
    }
  }

  @Post('2fa/setup')
  async setup2fa(@Headers('authorization') authHeader: string, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const secret = generateSecret();
      const appName = 'VoltiumSanrey';
      const email = payload.email || 'usuario@tienda.com';
      const otpauthUrl = `otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${appName}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

      return res.status(HttpStatus.OK).json({
        success: true,
        secret,
        qrCodeUrl,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al iniciar configuración 2FA: ${e.message}`,
      });
    }
  }

  @Post('2fa/verify')
  async verify2fa(@Headers('authorization') authHeader: string, @Body() body: any, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const { secret, code } = body;
      if (!secret || !code) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Secreto y código requeridos' });
      }

      const isValid = verifyTOTP(secret, String(code));
      if (!isValid) {
        return res.status(HttpStatus.OK).json({ success: false, message: 'Código 2FA incorrecto' });
      }

      await this.db.query('UPDATE usuarios SET totp_secret = %s WHERE id = %s', [secret, String(userId)]);
      return res.status(HttpStatus.OK).json({ success: true });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al verificar 2FA: ${e.message}`,
      });
    }
  }

  @Post('2fa/disable')
  async disable2fa(@Headers('authorization') authHeader: string, @Body() body: any, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const { code } = body;
      const rows = await this.db.query('SELECT totp_secret FROM usuarios WHERE id = %s', [String(userId)]);
      if (rows.length > 0 && rows[0].totp_secret && code) {
        const isValid = verifyTOTP(rows[0].totp_secret, String(code));
        if (!isValid) {
          return res.status(HttpStatus.OK).json({ success: false, message: 'Código de verificación incorrecto' });
        }
      }

      await this.db.query('UPDATE usuarios SET totp_secret = NULL WHERE id = %s', [String(userId)]);
      return res.status(HttpStatus.OK).json({ success: true });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al desactivar 2FA: ${e.message}`,
      });
    }
  }

  @Get('2fa/status')
  async status2fa(@Headers('authorization') authHeader: string, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const rows = await this.db.query(
        'SELECT totp_secret, email_2fa_enabled, backup_codes, correo FROM usuarios WHERE id = %s',
        [String(userId)]
      );
      if (!rows.length) {
        return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Usuario no encontrado' });
      }

      const user = rows[0];
      const totpEnabled = !!user.totp_secret;
      const emailEnabled = user.email_2fa_enabled === 1 || user.email_2fa_enabled === true;
      let backupCodesCount = 0;
      if (user.backup_codes) {
        try {
          const parsed = JSON.parse(user.backup_codes);
          backupCodesCount = Array.isArray(parsed) ? parsed.length : 0;
        } catch (_) {}
      }

      return res.status(HttpStatus.OK).json({
        success: true,
        enabled: totpEnabled || emailEnabled,
        totpEnabled,
        emailEnabled,
        email: user.correo,
        backupCodesCount,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al obtener estatus 2FA: ${e.message}`,
      });
    }
  }

  @Post('2fa/email/send')
  async sendEmail2faCode(@Headers('authorization') authHeader: string, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const rows = await this.db.query('SELECT correo FROM usuarios WHERE id = %s', [String(userId)]);
      if (!rows.length) {
        return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Usuario no encontrado' });
      }

      const email = rows[0].correo;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await this.emailsService.sendSecurityCode(email, code);
      email2faCodes.set(String(userId), {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000
      });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Código enviado a ${email}`,
        email,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al enviar código de correo: ${e.message}`,
      });
    }
  }

  @Post('2fa/email/verify')
  async verifyEmail2faCode(@Headers('authorization') authHeader: string, @Body() body: any, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const { code } = body;
      if (!code) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Código requerido' });
      }

      const entry = email2faCodes.get(String(userId));
      if (!entry || entry.code !== String(code).trim() || entry.expiresAt < Date.now()) {
        return res.status(HttpStatus.OK).json({
          success: false,
          message: 'El código introducido es incorrecto o ha expirado (válido 10 min).'
        });
      }

      email2faCodes.delete(String(userId));
      await this.db.query('UPDATE usuarios SET email_2fa_enabled = 1 WHERE id = %s', [String(userId)]);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Autenticación en 2 pasos por correo activada correctamente.',
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al verificar código: ${e.message}`,
      });
    }
  }

  @Post('2fa/email/disable')
  async disableEmail2fa(@Headers('authorization') authHeader: string, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      await this.db.query('UPDATE usuarios SET email_2fa_enabled = 0 WHERE id = %s', [String(userId)]);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Verificación por correo desactivada.',
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al desactivar 2FA por correo: ${e.message}`,
      });
    }
  }

  @Post('2fa/backup-codes/generate')
  async generateBackupCodes(@Headers('authorization') authHeader: string, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const codes: string[] = [];
      for (let i = 0; i < 8; i++) {
        const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        codes.push(`${p1}-${p2}`);
      }

      await this.db.query('UPDATE usuarios SET backup_codes = %s WHERE id = %s', [
        JSON.stringify(codes),
        String(userId)
      ]);

      return res.status(HttpStatus.OK).json({
        success: true,
        codes,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al generar códigos de respaldo: ${e.message}`,
      });
    }
  }

  @Post('login/2fa/resend-email')
  async resendLoginEmailOtp(@Body() body: any, @Res() res: express.Response) {
    try {
      const { tempToken } = body;
      if (!tempToken) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Token requerido' });
      }
      const payload = this.authService.verifyToken(tempToken);
      if (!payload || !payload.isTemp2fa) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'Sesión temporal expirada' });
      }

      const userId = payload.sub;
      const rows = await this.db.query('SELECT correo FROM usuarios WHERE id = %s', [String(userId)]);
      if (!rows.length) return res.status(HttpStatus.NOT_FOUND).json({ success: false });

      const email = rows[0].correo;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await this.emailsService.sendSecurityCode(email, code);
      email2faCodes.set(String(userId), { code, expiresAt: Date.now() + 10 * 60 * 1000 });

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Código reenviado a ${email}`,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al reenviar código: ${e.message}`,
      });
    }
  }

  @Post('change-password')
  async changePassword(@Headers('authorization') authHeader: string, @Body() body: any, @Res() res: express.Response) {
    try {
      if (!authHeader) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'No autorizado' });
      }
      const token = authHeader.split(' ')[1];
      const payload = this.authService.verifyToken(token);
      const userId = payload.sub;

      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Contraseña actual y nueva son requeridas' });
      }
      if (String(newPassword).length < 6) {
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
      }

      const rows = await this.db.query('SELECT contraseña FROM usuarios WHERE id = %s', [String(userId)]);
      if (!rows.length) return res.status(HttpStatus.NOT_FOUND).json({ success: false, message: 'Usuario no encontrado' });

      const match = this.authService.verifyPassword(String(currentPassword), String(rows[0].contraseña));
      if (!match) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ success: false, message: 'La contraseña actual no es correcta' });
      }

      const hashed = this.authService.hashPassword(String(newPassword));
      await this.db.query('UPDATE usuarios SET contraseña = %s, updated_at = NOW() WHERE id = %s', [
        hashed,
        String(userId)
      ]);

      return res.status(HttpStatus.OK).json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error al cambiar contraseña: ${e.message}`,
      });
    }
  }
}
