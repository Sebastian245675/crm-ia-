import { Controller, Get, Post, Delete, Body, Param, BadRequestException, UseGuards } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgencyPermissionGuard } from '../auth/agency-permission.guard';
import { RequireAgencyPermission } from '../auth/agency-permission.decorator';

@Controller('api/contabilidad')
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@RequireAgencyPermission('viewAccounting')
export class ContabilidadController {
  constructor(private readonly db: DatabaseService) {}

  @Get('resumen')
  async getResumen() {
    try {
      const ingresosRows = await this.db.query("SELECT SUM(monto) as total FROM contabilidad WHERE tipo = 'ingreso'");
      const egresosRows = await this.db.query("SELECT SUM(monto) as total FROM contabilidad WHERE tipo = 'egreso'");
      
      const ingresos = parseFloat(ingresosRows[0]?.total || ingresosRows[0]?.TOTAL || 0);
      const egresos = parseFloat(egresosRows[0]?.total || egresosRows[0]?.TOTAL || 0);

      const metodosRows = await this.db.query(
        "SELECT metodo_pago, tipo, SUM(monto) as total FROM contabilidad GROUP BY metodo_pago, tipo"
      );

      // Normalizar nombres de columnas a minúsculas
      const metodosNormalized = (metodosRows || []).map(row => ({
        metodo_pago: row.metodo_pago || row.METODO_PAGO || 'desconocido',
        tipo: row.tipo || row.TIPO,
        total: parseFloat(row.total || row.TOTAL || 0)
      }));

      return {
        ingresos,
        egresos,
        balance: ingresos - egresos,
        metodos: metodosNormalized
      };
    } catch (e: any) {
      throw new BadRequestException('Error al calcular el resumen contable: ' + e.message);
    }
  }

  @Get('movimientos')
  async getMovimientos() {
    try {
      const rows = await this.db.query("SELECT * FROM contabilidad ORDER BY fecha DESC");
      return rows.map(row => ({
        id: row.id || row.ID,
        tipo: row.tipo || row.TIPO,
        concepto: row.concepto || row.CONCEPTO,
        monto: parseFloat(row.monto || row.MONTO || 0),
        fecha: row.fecha || row.FECHA,
        metodo_pago: row.metodo_pago || row.METODO_PAGO,
        referencia_id: row.referencia_id || row.REFERENCIA_ID
      }));
    } catch (e: any) {
      throw new BadRequestException('Error al listar movimientos: ' + e.message);
    }
  }

  @Post('movimientos')
  async addMovimiento(@Body() body: any) {
    const { tipo, concepto, monto, metodo_pago, referencia_id } = body;
    if (!tipo || !concepto || monto === undefined || monto === null) {
      throw new BadRequestException('Tipo, concepto y monto son obligatorios');
    }

    if (tipo !== 'ingreso' && tipo !== 'egreso') {
      throw new BadRequestException('El tipo de movimiento debe ser ingreso o egreso');
    }

    try {
      await this.db.query(
        "INSERT INTO contabilidad (tipo, concepto, monto, metodo_pago, referencia_id) VALUES (%s, %s, %s, %s, %s)",
        [tipo, concepto, parseFloat(monto), metodo_pago || 'efectivo', referencia_id || null]
      );
      return { success: true };
    } catch (e: any) {
      throw new BadRequestException('Error al registrar movimiento: ' + e.message);
    }
  }

  @Delete('movimientos/:id')
  async deleteMovimiento(@Param('id') id: string) {
    try {
      await this.db.query("DELETE FROM contabilidad WHERE id = %s", [id]);
      return { success: true };
    } catch (e: any) {
      throw new BadRequestException('Error al eliminar movimiento: ' + e.message);
    }
  }
}
