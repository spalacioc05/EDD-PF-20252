import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  try {
    const server = app.getHttpServer();
    if (typeof server.setTimeout === 'function') {
      // Allow long-running TTS generation (e.g., full-book synthesis)
      server.setTimeout(30 * 60 * 1000);
    }
  } catch {}
}
bootstrap();
