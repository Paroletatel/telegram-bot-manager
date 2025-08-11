import { Module, forwardRef } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { MasterBotService } from './master-bot/master-bot.service';
import { WorkerBotService } from './worker-bot/worker-bot.service';

// СЕРВИСЫ для worker-bot
import { StateService } from './worker-bot/services/state.service';
import { NavigationService } from './worker-bot/services/navigation.service';
import { MessageService } from './worker-bot/services/message.service';
import { CallbackService } from './worker-bot/services/callback.service';
import { GroupChatService } from './worker-bot/services/group-chat.service';
import { StatusCheckerService } from './worker-bot/services/status-checker.service';
import { MembershipService } from './worker-bot/services/membership.service'; // ДОБАВИЛИ

// Импорты других модулей
import { TelegramBot as TelegramBotModel } from '../../models/telegram-bot.model';
import { UsersModule } from '../users/users.module';
import { RolesModule } from '../roles/roles.module';
import { AuthModule } from '../auth/auth.module';
import { States } from '../../models/states.model';
import { MembershipController } from './controllers/membership.controller';

@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([TelegramBotModel, States]),
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    MembershipController,
  ],
  providers: [
    MasterBotService,
    WorkerBotService,
    StateService,
    NavigationService,
    MessageService,
    CallbackService,
    GroupChatService,
    StatusCheckerService,
    MembershipService, // ДОБАВИЛИ
  ],
  exports: [
    MasterBotService,
    WorkerBotService,
    StateService,
    NavigationService,
    MessageService,
    CallbackService,
    GroupChatService,
    StatusCheckerService,
    MembershipService, // ДОБАВИЛИ
  ]
})
export class TelegramModule {}