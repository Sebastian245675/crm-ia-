import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });
  await app.listen(port, host);
  console.log(`NestJS Backend Server successfully started on http://${host}:${port}`);
}
bootstrap();
