import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MasterBotService } from './modules/telegram/master-bot/master-bot.service';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  // Enable CORS
  const allowedOrigins = [
    'http://localhost:3001',
    process.env.WEB_APP_URL
  ].filter(Boolean);
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );


  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Telegram Bot Manager API')
    .setDescription('API documentation for the Telegram Bot Manager application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Start master bot
  const masterBot = app.get(MasterBotService);
  await masterBot.launch();

  // Start server
  await app.listen(port);
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`Документация API доступна по адресу: http://localhost:${port}/api`);
}

bootstrap();
