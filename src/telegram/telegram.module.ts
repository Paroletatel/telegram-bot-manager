import { Module } from '@nestjs/common';
import { MasterBotService } from './master-bot/master-bot.service';
import { WorkerBotService } from './worker-bot/worker-bot.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [MasterBotService, WorkerBotService],
  exports: [MasterBotService, WorkerBotService],
})
export class TelegramModule {}
