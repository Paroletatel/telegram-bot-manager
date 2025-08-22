import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Sequelize } from 'sequelize-typescript';

import { AppModule } from './app.module';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { swaggerConfig } from './config/swagger.config';
import { MasterBotService } from './modules/telegram/master-bot/master-bot.service';
import { UsersChatsService } from './modules/users-chats/users-chats.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  const isSyncDB = process.env.IS_SYNC_DB ?? false;
  const logger = new Logger('Bootstrap');

  // Синхронизация моделей с базой данных в режиме разработки
  if (isSyncDB && process.env.NODE_ENV === 'development') {
    const sequelize = app.get(Sequelize);
    try {
      await sequelize.sync({
        alter: true, // изменяет существующие таблицы
        logging: (msg) => logger.debug?.(msg) ?? logger.log(msg), // показывает SQL запросы
      });
      logger.log('База данных синхронизирована с моделями');
    } catch (error) {
      logger.error('Ошибка синхронизации базы данных:', error as Error);
    }
  }

  // Мягкая миграция к мультибот-модели: создаём мастер-бота и проставляем botId для чатов без владельца
  const usersChatsService = app.get(UsersChatsService);
  await usersChatsService.migrateToBotIds();

  // Enable CORS (нормализуем URL до origin, т.к. заголовок Origin не содержит путь)
  const toOrigin = (value?: string) => {
    if (!value) return undefined;
    try {
      // Если передан уже origin без пути, new URL тоже вернёт origin
      const u = new URL(value);
      return `${u.protocol}//${u.host}`;
    } catch {
      return value; // как есть (например, http://localhost:3001)
    }
  };

  const allowedOrigins = [
    'http://localhost:3001',
    toOrigin(process.env.FRONTEND_URL),
    toOrigin(process.env.WEB_APP_URL),
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Разрешаем запросы без Origin (например, curl, Postman) и из whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} is not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposeHeaders: ['X-Request-Id'],
    optionsSuccessStatus: 204,
  });

  // Security headers (Helmet) + CSP
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            toOrigin(process.env.FRONTEND_URL) || 'http://localhost:3001',
            toOrigin(process.env.WEB_APP_URL) || 'http://localhost:3001',
            'https://*.telegram.org',
            'https://telegram.org',
          ].filter(Boolean) as string[],
          frameAncestors: ["'self'", 'https://web.telegram.org', 'https://*.telegram.org'],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
        },
        // Включите reportOnly на первых порах, если нужно собрать отчёты, не ломая работу
        // reportOnly: true,
      },
      // crossOriginEmbedderPolicy может мешать, если есть сторонние ресурсы; включайте по необходимости
      // crossOriginEmbedderPolicy: false,
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api');

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global interceptors
  app.useGlobalInterceptors(new RequestIdInterceptor());

  // Swagger documentation (centralized config)
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
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
  logger.log(`Сервер запущен на порту ${port}`);
  logger.log(`Документация API доступна по адресу: http://localhost:${port}/api/docs`);
}

bootstrap();
