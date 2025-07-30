import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MasterBotService } from './telegram/master-bot/master-bot.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const masterBot = app.get(MasterBotService);
  await masterBot.launch();

  console.log(`Сервер запущен на порту ${process.env.PORT || 3000}`);
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
