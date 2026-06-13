import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import * as express from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  private buildUserResponse(user: any, subscription: any) {
    const userResponse = {
      id: String(user.id),
      name: user.nombre || user.name || user.email,
      email: user.correo || user.email,
      sub_cuenta: user.sub_cuenta ?? null,
      liberta: user.liberta ?? 'no',
      subscription: subscription || {
        plan: 'basic',
        plan_display_name: 'Plan básico',
        status: 'active',
        is_demo: false,
        trial_ends_at: null,
      },
    };

    const token = this.authService.signToken({
      sub: userResponse.id,
      email: userResponse.email,
      name: userResponse.name,
      plan: userResponse.subscription.plan,
      plan_status: userResponse.subscription.status,
    });

    return {
      ...userResponse,
      access_token: token,
      token_type: 'bearer',
      expires_in: 60 * 60 * 24,
    };
  }

  private planDisplayName(plan: string) {
    if (plan === 'deluxe-ilimitado-websy') return 'free merco';
    if (plan === 'free-trial') return 'Free Trial';
    if (plan === 'basic') return 'Plan básico';
    if (plan === 'premium') return 'Plan premium';
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

  private async resolveSubscription(user: any) {
    const existing = await this.getSubscriptionForUser(user.id);
    if (existing) {
      return existing;
    }

    const email = String(user.correo || user.email || '').toLowerCase();
    const isDemo = this.isDemoAccount(email);
    if (isDemo) {
      return await this.createSubscription(user.id, 'deluxe-ilimitado-websy', 'trial', true, 14);
    }

    return await this.createSubscription(user.id, 'basic', 'active', false, null);
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
        'SELECT id, nombre, correo, contraseña, sub_cuenta, liberta FROM usuarios WHERE correo = %s',
        [lowEmail]
      );

      if (rows.length > 0) {
        const user = rows[0];
        const passDb = user.contraseña;

        let match = false;
        if (String(password) === String(passDb)) {
          match = true;
        } else {
          const numPass = parseFloat(password);
          const numDbPass = parseFloat(passDb);
          if (!isNaN(numPass) && !isNaN(numDbPass) && numPass === numDbPass) {
            match = true;
          }
        }

        if (match) {
          const subscription = await this.resolveSubscription(user);
          return res.status(HttpStatus.OK).json({
            success: true,
            user: this.buildUserResponse(user, subscription),
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

      const lowEmail = String(correo).toLowerCase();
      const rows = await this.db.query('SELECT id FROM usuarios WHERE correo = %s', [lowEmail]);
      if (rows.length > 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'El correo ya está registrado',
        });
      }

      const insertResult = await this.db.query(
        'INSERT INTO usuarios (nombre, correo, contraseña, sub_cuenta, liberta) VALUES (%s, %s, %s, %s, %s) RETURNING id',
        [nombre, lowEmail, String(contraseña), null, 'no']
      );

      const nuevoId = insertResult[0]?.id || null;
      const user = {
        id: nuevoId,
        nombre,
        correo: lowEmail,
        sub_cuenta: null,
        liberta: 'no',
      };
      const subscription = await this.createSubscription(nuevoId, 'free-trial', 'trial', false, 14);

      return res.status(HttpStatus.OK).json({
        success: true,
        user: this.buildUserResponse(user, subscription),
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error en el servidor: ${e.message}`,
      });
    }
  }
}
