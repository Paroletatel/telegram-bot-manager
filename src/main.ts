import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MasterBotService } from "./modules/telegram/master-bot/master-bot.service";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Sequelize } from "sequelize-typescript";
import helmet from "helmet";
import { UsersChatsService } from "./modules/users-chats/users-chats.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;

  // Синхронизация моделей с базой данных в режиме разработки - пока отключено
  if (true && process.env.NODE_ENV === "development") {
    const sequelize = app.get(Sequelize);
    try {
      await sequelize.sync({
        alter: true, // изменяет существующие таблицы
        logging: console.log, // показывает SQL запросы
      });
      console.log("База данных синхронизирована с моделями");
    } catch (error) {
      console.error("Ошибка синхронизации базы данных:", error);
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
    "http://localhost:3001",
    toOrigin(process.env.FRONTEND_URL),
    toOrigin(process.env.WEB_APP_URL),
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Разрешаем запросы без Origin (например, curl, Postman) и из whitelist
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(
        new Error(`CORS: Origin ${origin} is not allowed`),
        false
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
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
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: [
            "'self'",
            toOrigin(process.env.FRONTEND_URL) || "http://localhost:3001",
            toOrigin(process.env.WEB_APP_URL) || "http://localhost:3001",
            "https://*.telegram.org",
            "https://telegram.org",
          ].filter(Boolean) as string[],
          frameAncestors: [
            "'self'",
            "https://web.telegram.org",
            "https://*.telegram.org",
          ],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
        },
        // Включите reportOnly на первых порах, если нужно собрать отчёты, не ломая работу
        // reportOnly: true,
      },
      // crossOriginEmbedderPolicy может мешать, если есть сторонние ресурсы; включайте по необходимости
      // crossOriginEmbedderPolicy: false,
    })
  );

  // Global API prefix
  app.setGlobalPrefix("api");

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    })
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle("Telegram Bot Manager API")
    .setDescription(
      "API documentation for the Telegram Bot Manager application"
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        name: "JWT",
        description: "Enter JWT token",
        in: "header",
      },
      "JWT-auth"
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  // Start master bot
  const masterBot = app.get(MasterBotService);
  await masterBot.launch();

  // Start server
  await app.listen(port);
  console.log(`Сервер запущен на порту ${port}`);
  console.log(
    `Документация API доступна по адресу: http://localhost:${port}/api`
  );
}

bootstrap();
