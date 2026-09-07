import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DatabaseService } from '../database/database.service';

const AGENCY_PERMISSION_KEYS = [
  'viewDashboard',
  'manageMessages',
  'manageContacts',
  'manageCalendar',
  'manageOpportunities',
  'manageProducts',
  'publishProducts',
  'manageMarketing',
  'manageOrders',
  'accessErp',
  'manageWebsite',
  'accessAiAssistant',
  'viewAccounting',
  'manageSettings',
] as const;

@Controller('api/subaccounts')
@UseGuards(JwtAuthGuard)
export class SubaccountsController {
  constructor(
    private readonly db: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  private normalizePermissions(input: unknown) {
    const source = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    return Object.fromEntries(AGENCY_PERMISSION_KEYS.map((key) => [key, source[key] === true]));
  }

  private parsePermissions(value: unknown) {
    if (!value) return this.normalizePermissions({});
    if (typeof value === 'object') return this.normalizePermissions(value);
    try {
      return this.normalizePermissions(JSON.parse(String(value)));
    } catch (_) {
      return this.normalizePermissions({});
    }
  }

  private async requireAgencyOwner(request: express.Request) {
    const authUser = (request as any).user;
    const rows = await this.db.query(
      'SELECT id, nombre, correo, sub_cuenta, account_role, agency_id, active FROM usuarios WHERE id = %s',
      [String(authUser?.sub || '')]
    );
    if (!rows.length) throw new ForbiddenException('La sesión no corresponde a un usuario activo.');

    const owner = rows[0];
    const role = owner.account_role || (owner.sub_cuenta ? 'agency_user' : 'agency_owner');
    const isActive = owner.active === undefined || owner.active === null || owner.active === true || owner.active === 1;
    if (!isActive || role !== 'agency_owner') {
      throw new ForbiddenException('Solo la cuenta principal de la agencia puede administrar subcuentas.');
    }

    return { ...owner, agencyId: String(owner.agency_id || owner.id) };
  }

  private serialize(user: any) {
    return {
      id: String(user.id),
      name: user.nombre,
      email: user.correo,
      phone: user.phone || '',
      sub_cuenta: 'si',
      liberta: user.liberta || 'no',
      account_role: 'agency_user',
      agency_id: String(user.agency_id),
      parent_user_id: user.parent_user_id ? String(user.parent_user_id) : null,
      permissions: this.parsePermissions(user.permissions),
      active: user.active === true || user.active === 1,
      created_at: user.created_at || null,
      updated_at: user.updated_at || null,
    };
  }

  @Get()
  async list(@Req() request: express.Request) {
    const owner = await this.requireAgencyOwner(request);
    const rows = await this.db.query(
      `SELECT id, nombre, correo, phone, liberta, agency_id, parent_user_id, permissions, active, created_at, updated_at
       FROM usuarios
       WHERE agency_id = %s AND account_role = %s
       ORDER BY created_at DESC`,
      [owner.agencyId, 'agency_user']
    );
    return { success: true, agency_id: owner.agencyId, data: rows.map((row) => this.serialize(row)) };
  }

  @Post()
  async create(@Req() request: express.Request, @Body() body: any) {
    const owner = await this.requireAgencyOwner(request);
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!name || !email || !email.includes('@')) throw new BadRequestException('Nombre y correo válido son obligatorios.');
    if (password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');

    const duplicate = await this.db.query('SELECT id FROM usuarios WHERE correo = %s', [email]);
    if (duplicate.length) throw new BadRequestException('El correo ya está registrado.');

    const permissions = this.normalizePermissions(body?.permissions);
    const inserted = await this.db.query(
      `INSERT INTO usuarios
       (nombre, correo, contraseña, sub_cuenta, liberta, account_role, agency_id, parent_user_id, permissions, active, phone, created_at, updated_at)
       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id`,
      [
        name,
        email,
        this.authService.hashPassword(password),
        'si',
        permissions.publishProducts ? 'si' : 'no',
        'agency_user',
        owner.agencyId,
        String(owner.id),
        JSON.stringify(permissions),
        true,
        String(body?.phone || '').trim(),
      ]
    );
    const rows = await this.db.query(
      `SELECT id, nombre, correo, phone, liberta, agency_id, parent_user_id, permissions, active, created_at, updated_at
       FROM usuarios WHERE id = %s AND agency_id = %s`,
      [String(inserted[0]?.id), owner.agencyId]
    );
    return { success: true, data: this.serialize(rows[0]) };
  }

  @Patch(':id')
  async update(@Req() request: express.Request, @Param('id') id: string, @Body() body: any) {
    const owner = await this.requireAgencyOwner(request);
    const targetRows = await this.db.query(
      'SELECT id FROM usuarios WHERE id = %s AND agency_id = %s AND account_role = %s',
      [String(id), owner.agencyId, 'agency_user']
    );
    if (!targetRows.length) throw new NotFoundException('La subcuenta no pertenece a esta agencia.');

    const name = String(body?.name || '').trim();
    if (!name) throw new BadRequestException('El nombre es obligatorio.');
    const permissions = this.normalizePermissions(body?.permissions);
    const active = body?.active !== false;
    const newPassword = body?.password === undefined ? '' : String(body.password);
    if (newPassword && newPassword.length < 8) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 8 caracteres.');
    }
    await this.db.query(
      `UPDATE usuarios
       SET nombre = %s, phone = %s, permissions = %s, liberta = %s, active = %s, updated_at = NOW()
       WHERE id = %s AND agency_id = %s AND account_role = %s`,
      [name, String(body?.phone || '').trim(), JSON.stringify(permissions), permissions.publishProducts ? 'si' : 'no', active, String(id), owner.agencyId, 'agency_user']
    );
    if (newPassword) {
      await this.db.query(
        'UPDATE usuarios SET contraseña = %s, updated_at = NOW() WHERE id = %s AND agency_id = %s AND account_role = %s',
        [this.authService.hashPassword(newPassword), String(id), owner.agencyId, 'agency_user']
      );
    }
    const rows = await this.db.query(
      `SELECT id, nombre, correo, phone, liberta, agency_id, parent_user_id, permissions, active, created_at, updated_at
       FROM usuarios WHERE id = %s AND agency_id = %s`,
      [String(id), owner.agencyId]
    );
    return { success: true, data: this.serialize(rows[0]) };
  }

  @Delete(':id')
  async remove(@Req() request: express.Request, @Param('id') id: string) {
    const owner = await this.requireAgencyOwner(request);
    await this.db.query(
      'DELETE FROM usuarios WHERE id = %s AND agency_id = %s AND account_role = %s',
      [String(id), owner.agencyId, 'agency_user']
    );
    return { success: true };
  }
}
