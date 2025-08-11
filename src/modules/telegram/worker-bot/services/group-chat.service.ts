import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { NavigationService } from './navigation.service';
import { MembershipService } from './membership.service'; // ДОБАВИЛИ
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GroupChatService {
  private readonly logger = new Logger(GroupChatService.name);
  private groupsID: string[] = [];

  constructor(
    private readonly navigationService: NavigationService,
    private readonly membershipService: MembershipService, // ДОБАВИЛИ
    private readonly configService: ConfigService,
  ) {
    this.loadGroups();
  }

  private async loadGroups(): Promise<void> {
    try {
      // TODO: Загрузить группы из API как в оригинале
      // const response = await axios.get(process.env.BACKEND_URL + 'usersChats');
      // this.groupsID = response.data;
      this.logger.log('Groups loaded (placeholder)');
    } catch (error) {
      this.logger.error('Error loading groups:', error);
    }
  }

  async processGroupMessage(
    bot: TelegramBot,
    message: TelegramBot.Message,
    groupId: string,
    userId: string,
    text: string
  ): Promise<void> {
    try {
      // Проверка команды /group
      if (text === '/group' && this.isGroupChat(message.chat.type)) {
        return await this.handleGroupCommand(bot, message);
      }

      // Обработка новых участников
      if (message.new_chat_members) {
        return await this.handleNewChatMembers(bot, message);
      }

      // Обработка обычного сообщения в группе
      // TODO: Реализовать логику из groupChatWorker.js
      // Включая AI проверку сообщений и поиск контактов
      this.logger.log(`Group message from ${userId} in ${groupId}: ${text}`);

    } catch (error) {
      this.logger.error('Error processing group message:', error);
    }
  }

  private isGroupChat(chatType: string): boolean {
    return chatType === 'group' || chatType === 'supergroup';
  }

  private async handleGroupCommand(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
    if (message.from) {
      try {
        // ИСПОЛЬЗУЕМ MembershipService
        const isAdmin = await this.membershipService.checkAdminMembership(
          bot, 
          message.chat.id, 
          message.from.id
        );
        
        if (isAdmin) {
          await bot.sendMessage(
            message.from.id,
            `ID группы: \`${message.chat.id}\`\n\nИспользуйте этот ID для добавления группы в систему.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          this.logger.warn(`User ${message.from.id} tried to use /group but is not admin in chat ${message.chat.id}`);
        }
      } catch (error) {
        this.logger.error('Error in group command:', error);
      }
    }
  }

  private async handleNewChatMembers(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
    if (message.new_chat_members) {
      for (const newMember of message.new_chat_members) {
        this.logger.log(`New member ${newMember.first_name} joined group ${message.chat.id}`);
        
        // TODO: Реализовать логику приветствия новых участников
        // из оригинального кода, если она была
      }
    }
  }

  async addGroup(chatId: string, chatName: string): Promise<boolean> {
    try {
      // TODO: Добавить группу через API как в оригинале
      // await axios.post(process.env.BACKEND_URL + 'usersChats/addChat', {
      //   chatId,
      //   chatName
      // });
      
      this.groupsID.push(chatId);
      this.logger.log(`Group ${chatName} (${chatId}) added`);
      return true;
    } catch (error) {
      this.logger.error(`Error adding group ${chatId}:`, error);
      return false;
    }
  }

  getGroups(): string[] {
    return this.groupsID;
  }

  async refreshGroups(): Promise<void> {
    await this.loadGroups();
  }
}