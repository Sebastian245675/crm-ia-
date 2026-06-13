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
  ],
  providers: [AppService, DatabaseService, AgentService, AuthService, JwtAuthGuard],
  exports: [DatabaseService, AgentService, AuthService],
})
export class AppModule {}
