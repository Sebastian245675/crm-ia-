import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService, private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization as string | undefined;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '').trim();
    }

    if (!token && request.query && typeof request.query.access_token === 'string') {
      token = request.query.access_token;
    }

    if (!token) {
      throw new UnauthorizedException('Authorization token missing or invalid');
    }
    try {
      const payload = this.authService.verifyToken(token);
      const users = await this.db.query(
        'SELECT id, active, sub_cuenta, account_role, agency_id, parent_user_id FROM usuarios WHERE id = %s LIMIT 1',
        [String(payload.sub || '')],
      );
      if (!users.length) throw new UnauthorizedException('La cuenta ya no existe');
      if (users[0].active === false || users[0].active === 0 || users[0].active === 'false') {
        throw new ForbiddenException('La cuenta está desactivada');
      }
      const user = users[0];
      const ownerId = String(
        user.account_role === 'agency_user' || user.sub_cuenta === 'si'
          ? (user.agency_id || user.parent_user_id || user.id)
          : user.id
      );
      const subscriptions = await this.db.query(
        'SELECT status, trial_ends_at FROM suscripciones WHERE user_id = %s ORDER BY created_at DESC LIMIT 1',
        [ownerId],
      );
      const subscription = subscriptions[0];
      const trialExpired = subscription?.status === 'expired' || (
        subscription?.status === 'trial' &&
        subscription?.trial_ends_at &&
        new Date(subscription.trial_ends_at).getTime() <= Date.now()
      );
      if (trialExpired) {
        if (subscription.status === 'trial') {
          await this.db.query(
            'UPDATE suscripciones SET status = %s, updated_at = NOW() WHERE user_id = %s AND status = %s',
            ['expired', ownerId, 'trial'],
          );
        }
        await this.db.query(
          'UPDATE usuarios SET active = %s, updated_at = NOW() WHERE id = %s OR agency_id = %s',
          [0, ownerId, ownerId],
        );
        throw new ForbiddenException('Tu periodo de prueba de 15 dias finalizo. Contrata un plan para reactivar tu cuenta.');
      }
      request.user = payload;
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
