import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api', {
    exclude: ['/'],
  });
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`HotelOps API running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
