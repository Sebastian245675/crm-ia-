import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './database/database.service';
import { ProductsController } from './products/products.controller';
import { DbController } from './db/db.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UploadController } from './upload/upload.controller';
import { AgentController } from './agent/agent.controller';
import { AgentService } from './agent/agent.service';
import { VentasController } from './ventas/ventas.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { EmailsController } from './emails/emails.controller';
import { EmailsService } from './emails/emails.service';
import { TikTokController } from './tiktok/tiktok.controller';
import { FacturacionController } from './facturacion/facturacion.controller';
import { FacturacionService } from './facturacion/facturacion.service';
import { ContabilidadController } from './contabilidad/contabilidad.controller';
import { SubaccountsController } from './subaccounts/subaccounts.controller';
import { AgencyPermissionGuard } from './auth/agency-permission.guard';
import { PublicFormsController } from './forms/public-forms.controller';

@Module({
  imports: [],
  controllers: [
    AppController,
    ProductsController,
    DbController,
    AuthController,
    UploadController,
    AgentController,
    VentasController,
    EmailsController,
    TikTokController,
    FacturacionController,
    ContabilidadController,
    SubaccountsController,
    PublicFormsController,
  ],
  providers: [
    AppService,
    DatabaseService,
    AgentService,
    AuthService,
    JwtAuthGuard,
    AgencyPermissionGuard,
    EmailsService,
    FacturacionService,
  ],
  exports: [DatabaseService, AgentService, AuthService],
})
export class AppModule {}

