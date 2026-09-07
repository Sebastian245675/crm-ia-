import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../database/database.service';
import { AuthService } from './auth.service';
import { AGENCY_PERMISSION_KEY, AgencyPermission } from './agency-permission.decorator';

const TABLE_PERMISSIONS: Record<string, AgencyPermission> = {
  conversations: 'manageMessages', messages: 'manageMessages',
  contacts: 'manageContacts', tasks: 'manageContacts',
  appointments: 'manageCalendar', calendars: 'manageCalendar', calendar_events: 'manageCalendar', calendar_settings: 'manageCalendar',
  opportunities: 'manageOpportunities', pipelines: 'manageOpportunities', sales_opportunities: 'manageOpportunities',
  products: 'manageProducts', categories: 'manageProducts', filters: 'manageProducts', filter_options: 'manageProducts',
  product_templates: 'manageProducts', pending_merchandise: 'manageProducts', price_history: 'manageProducts', revision: 'manageProducts',
  campaigns: 'manageMarketing', marketing_campaigns: 'manageMarketing', social_posts: 'manageMarketing', media: 'manageMarketing', media_library: 'manageMarketing',
  orders: 'manageOrders', sales: 'manageOrders', lineas_facturacion: 'viewAccounting',
  websites: 'manageWebsite', pages: 'manageWebsite', funnels: 'manageWebsite', forms: 'manageWebsite', comments: 'manageWebsite',
  info_sections: 'manageWebsite',
  accounting: 'viewAccounting', erp_accounting: 'viewAccounting', invoices: 'viewAccounting',
  knowledge_bases: 'accessAiAssistant',
  company_profile: 'manageSettings', settings: 'manageSettings', mail_config: 'manageSettings',
};

const PUBLIC_WRITE_ACTIONS: Record<string, string[]> = {
  orders: ['insert'],
  carts: ['insert', 'update', 'upsert', 'delete'],
  product_analytics: ['insert', 'update', 'upsert'],
  product_views: ['insert', 'update', 'upsert'],
  website_visits: ['insert', 'update', 'upsert'],
  product_reviews: ['insert'],
  wishlists: ['insert', 'update', 'upsert', 'delete'],
  user_addresses: ['insert', 'update', 'upsert', 'delete'],
};

@Injectable()
export class AgencyPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const declaredPermission = this.reflector.getAllAndOverride<AgencyPermission | 'table'>(
      AGENCY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const tableName = String(request.params?.table_name || '').toLowerCase();

    if (!request.user && declaredPermission === 'table') {
      const authHeader = String(request.headers?.authorization || '');
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!token) {
        const allowedActions = PUBLIC_WRITE_ACTIONS[tableName] || [];
        if (allowedActions.includes(String(request.body?.action || '').toLowerCase())) return true;
        throw new UnauthorizedException('Debes iniciar sesión para modificar este recurso');
      }
      try {
        request.user = this.authService.verifyToken(token);
      } catch (_) {
        throw new UnauthorizedException('Sesión no válida');
      }
    }

    const userId = request.user?.sub;
    if (!userId) throw new UnauthorizedException('Sesión no válida');

    const users = await this.db.query(
      'SELECT id, account_role, permissions, active FROM usuarios WHERE id = %s LIMIT 1',
      [userId],
    );
    const user = users[0];
    if (!user || user.active === false || user.active === 0 || user.active === 'false') {
      throw new ForbiddenException('La cuenta está desactivada');
    }

    const role = String(user.account_role || 'agency_owner');
    if (role === 'agency_owner' || role === 'saas_admin') return true;
    if (role !== 'agency_user') throw new ForbiddenException('Rol de cuenta no autorizado');

    let permission = declaredPermission;
    if (permission === 'table') {
      permission = TABLE_PERMISSIONS[tableName] || 'manageSettings';
    }
    if (!permission) throw new ForbiddenException('El recurso no tiene una política de acceso definida');

    let permissions: Record<string, boolean> = {};
    try {
      permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions || '{}') : (user.permissions || {});
    } catch (_) {}

    if (permissions[permission] !== true) {
      throw new ForbiddenException(`La subcuenta no tiene el permiso ${permission}`);
    }
    return true;
  }
}
