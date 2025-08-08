import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BotManagerService } from './bot-manager.service';
import { IGroupInfo } from '../interfaces/bot.interface';
import TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class GroupService {
  private readonly logger = new Logger(GroupService.name);
  private groupsCache: string[] = [];

  constructor(
    @InjectModel('UsersChats') private readonly usersChatsModel: any,
    @InjectModel('Chats') private readonly chatsModel: any,
    private readonly botManagerService: BotManagerService,
  ) {
    this.loadGroups();
  }

  private async loadGroups(): Promise<void> {
    try {
      const groups = await this.usersChatsModel.findAll({
        attributes: ['groupId'],
        group: ['groupId']
      });
      
      this.groupsCache = groups.map(g => g.groupId);
      this.logger.log(`Загружено ${this.groupsCache.length} групп`);
    } catch (error) {
      this.logger.error('Ошибка загрузки групп:', error);
      this.groupsCache = [];
    }
  }

  async addGroup(chatId: string, chatName: string): Promise<boolean> {
    try {
      await this.chatsModel.findOrCreate({
        where: { chatId },
        defaults: {
          chatId,
          chatName,
          isActive: true
        }
      });
      
      if (!this.groupsCache.includes(chatId)) {
        this.groupsCache.push(chatId);
      }
      
      this.logger.log(`Группа ${chatName} (${chatId}) добавлена`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка добавления группы ${chatId}:`, error);
      return false;
    }
  }

  async removeGroup(chatId: string): Promise<boolean> {
    try {
      await this.chatsModel.update(
        { isActive: false },
        { where: { chatId } }
      );
      
      this.groupsCache = this.groupsCache.filter(id => id !== chatId);
      
      this.logger.log(`Группа ${chatId} деактивирована`);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка удаления группы ${chatId}:`, error);
      return false;
    }
  }

  getGroups(): string[] {
    return [...this.groupsCache];
  }

  isRegisteredGroup(chatId: string): boolean {
    return this.groupsCache.includes(chatId);
  }

  async addUserToGroup(userId: number, groupId: string): Promise<boolean> {
    try {
      await this.usersChatsModel.findOrCreate({
        where: {
          userId: userId.toString(),
          groupId
        },
        defaults: {
          userId: userId.toString(),
          groupId,
          joinedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      this.logger.error(`Ошибка добавления пользователя ${userId} в группу ${groupId}:`, error);
      return false;
    }
  }

  async handleNewChatMembers(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
    if (!message.new_chat_members || !message.chat) return;

    const chatId = message.chat.id.toString();
    
    if (!this.isRegisteredGroup(chatId)) {
      return;
    }

    for (const member of message.new_chat_members) {
      if (member.is_bot) continue;
      
      try {
        await this.addUserToGroup(member.id, chatId);
        this.logger.log(`Пользователь ${member.id} добавлен в группу ${chatId}`);
      } catch (error) {
        this.logger.error(`Ошибка при добавлении пользователя ${member.id} в группу:`, error);
      }
    }
  }

  async refreshGroups(): Promise<void> {
    await this.loadGroups();
  }
}