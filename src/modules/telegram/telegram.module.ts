import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Основные сервисы
import { MasterBotService } from './master-bot/master-bot.service';
import { WorkerBotService } from './worker-bot/worker-bot.service';
import { BotManagerService } from './services/bot-manager.service';
import { MembershipService } from './services/membership.service';
import { MessageProcessorService } from './services/message-processor.service';
import { StateService } from './services/state.service';
import { GroupService } from './services/group.service';
import { RegistrationService } from './services/registration.service';
import { KeyboardService } from './services/keyboard.service';
import { StatusCheckerService } from './services/status-checker.service';
import { TelegramInitService } from './services/telegram-init.service';

// Контроллеры
import { TelegramApiController } from './controllers/telegram-api.controller';

// Внешние модули
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../modules/roles/roles.module';
import { JwtAuthService } from '../auth/jwt.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(), // Для периодических задач (StatusCheckerService)
    DatabaseModule,
    AuthModule,
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule)
  ],
  controllers: [TelegramApiController],
  providers: [
    // Основные сервисы ботов
    MasterBotService,
    WorkerBotService,
    
    // Сервисы управления
    BotManagerService,
    MessageProcessorService,
    TelegramInitService,
    
    // Функциональные сервисы
    MembershipService,
    StateService,
    GroupService,
    RegistrationService,
    KeyboardService,
    StatusCheckerService,
    
    // JWT сервис
    JwtAuthService
  ],
  exports: [
    // Экспортируем основные сервисы для использования в других модулях
    MasterBotService,
    WorkerBotService,
    BotManagerService,
    MembershipService,
    MessageProcessorService,
    StateService,
    GroupService,
    RegistrationService,
    StatusCheckerService,
    TelegramInitService,
    JwtAuthService
  ],
})
export class TelegramModule {}