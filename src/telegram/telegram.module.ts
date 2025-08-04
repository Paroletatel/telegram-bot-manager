import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MasterBotService } from './master-bot/master-bot.service';
import { WorkerBotService } from './worker-bot/worker-bot.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { JwtAuthService } from '../auth/jwt.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    AuthModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule)
  ],
  providers: [
    MasterBotService, 
    WorkerBotService,
    JwtAuthService
  ],
  exports: [
    MasterBotService, 
    WorkerBotService,
    JwtAuthService
  ],
})
export class TelegramModule {}
