import { Controller, Get, HttpStatus, Param, Query, Res, UseGuards } from '@nestjs/common';
import { EmailsService } from './emails.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AgencyPermissionGuard } from '../auth/agency-permission.guard';
import { RequireAgencyPermission } from '../auth/agency-permission.decorator';
import * as express from 'express';

@Controller('api/emails')
@UseGuards(JwtAuthGuard, AgencyPermissionGuard)
@RequireAgencyPermission('manageMessages')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get()
  async getEmails(@Query('refresh') refresh: string, @Res() res: express.Response) {
    try {
      const result = await this.emailsService.fetchEmails(refresh === '1');
      if (!result.success) {
        return res.status(HttpStatus.BAD_REQUEST).json(result);
      }
      return res.status(HttpStatus.OK).json(result);
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Error interno en el servidor: ${e.message}`,
      });
    }
  }

  @Get(':uid')
  async getEmail(@Param('uid') uid: string, @Res() res: express.Response) {
    try {
      const result = await this.emailsService.fetchEmail(Number(uid));
      return res.status(result.success ? HttpStatus.OK : HttpStatus.BAD_REQUEST).json(result);
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: `Error interno en el servidor: ${e.message}` });
    }
  }
}
