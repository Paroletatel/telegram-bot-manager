import { forwardRef,Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';

import { States } from '../../models/states.model';
// Импорты других модулей
import { TelegramBot as TelegramBotModel } from '../../models/telegram-bot.model';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { UsersChatsModule } from '../users-chats/users-chats.module';
import { MembershipController } from './controllers/membership.controller';
import { MasterBotService } from './master-bot/master-bot.service';
import { CallbackService } from './worker-bot/services/callback.service';
import { GroupChatService } from './worker-bot/services/group-chat.service';
import { MembershipService } from './worker-bot/services/membership.service'; // ДОБАВИЛИ
import { MessageService } from './worker-bot/services/message.service';
import { NavigationService } from './worker-bot/services/navigation.service';
// СЕРВИСЫ для worker-bot
import { StateService } from './worker-bot/services/state.service';
import { StatusCheckerService } from './worker-bot/services/status-checker.service';
import { WorkerBotService } from './worker-bot/worker-bot.service';

@Module({
  imports: [
    ConfigModule,
    SequelizeModule.forFeature([TelegramBotModel, States]),
    forwardRef(() => UsersModule),
    forwardRef(() => RolesModule),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersChatsModule),
  ],
  controllers: [MembershipController],
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
  ],
})
export class TelegramModule {}
