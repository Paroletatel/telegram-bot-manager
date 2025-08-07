import { Module } from '@nestjs/common';
import { UsersChatsController } from './users_chats.controller';
import { UsersChatsService } from './users_chats.service';
import { UsersChats } from './users_chats.model';
import { Chats } from './chats.model';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  controllers: [UsersChatsController],
  providers: [UsersChatsService],
  imports: [SequelizeModule.forFeature([UsersChats, Chats])],
  exports: [UsersChatsService],
})
export class UsersChatsModule {}
