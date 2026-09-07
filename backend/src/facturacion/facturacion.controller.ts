import { Controller, Post, Get, Body, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { FacturacionService } from './facturacion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgencyPermissionGuard } from '../auth/agency-permission.guard';
import { RequireAgencyPermission } from '../auth/agency-permission.decorator';
import * as express from 'express';

@Controller('api/facturacion')
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@RequireAgencyPermission('viewAccounting')
export class FacturacionController {
  constructor(private readonly facturacionService: FacturacionService) {}

  @Post('timbrar')
  async timbrar(@Body() body: any, @Res() res: express.Response) {
    try {
      const result = await this.facturacionService.timbrarFactura(body);
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      return res.status(e.getStatus ? e.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: e.message,
      });
    }
  }

  @Get('historial')
  async getHistorial(@Res() res: express.Response) {
    try {
      const result = await this.facturacionService.getHistorial();
      return res.status(HttpStatus.OK).json({
        success: true,
        facturas: result,
      });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: e.message,
      });
    }
  }
}
