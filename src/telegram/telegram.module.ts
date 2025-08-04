import { Module, forwardRef } from '@nestjs/common';
import { MasterBotService } from './master-bot/master-bot.service';
import { WorkerBotService } from './worker-bot/worker-bot.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule)
  ],
  providers: [MasterBotService, WorkerBotService],
  exports: [MasterBotService, WorkerBotService],
})
export class TelegramModule {}
