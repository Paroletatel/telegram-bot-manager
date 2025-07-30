import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { TelegramModule } from './telegram/telegram.module';
import { BotManagerCron } from './cron/bot-manager.cron';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    TelegramModule,
  ],
  providers: [BotManagerCron],
})
export class AppModule {}
