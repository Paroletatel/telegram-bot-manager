import { forwardRef,Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { TelegramModule } from '../telegram/telegram.module';
import { Bot } from './bots.model';
import { Chats } from './chats.model';
import { UserChat } from './user-chat.model';
import { UsersChatsController } from './users-chats.controller';
import { UsersChats } from './users-chats.model';
import { UsersChatsService } from './users-chats.service';

@Module({
  controllers: [UsersChatsController],
  providers: [UsersChatsService],
  imports: [
    SequelizeModule.forFeature([UsersChats, Chats, Bot, UserChat]),
    forwardRef(() => TelegramModule), // Используем forwardRef для избежания циклических зависимостей
  ],
  exports: [UsersChatsService],
})
export class UsersChatsModule {}
