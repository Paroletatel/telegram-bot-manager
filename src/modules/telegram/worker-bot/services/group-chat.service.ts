import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { NavigationService } from './navigation.service';
import { MembershipService } from './membership.service'; 
import { ConfigService } from '@nestjs/config';
import { UsersChatsService } from '../../../users-chats/users-chats.service';
import { UsersService } from '../../../users/users.service';

@Injectable()
export class GroupChatService {
  private readonly logger = new Logger(GroupChatService.name);
  private groupsID: string[] = [];

  constructor(
    private readonly navigationService: NavigationService,
    private readonly membershipService: MembershipService, 
    private readonly configService: ConfigService,
    private readonly usersChatsService: UsersChatsService,
    private readonly usersService: UsersService,
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
      const chatType = message.chat.type;
      const chatTitle = message.chat.title || '';
      this.logger.log(`processGroupMessage: chatType=${chatType}, groupId=${groupId}, userId=${userId}, title="${chatTitle}", textLen=${text?.length || 0}`);
      if (!groupId) this.logger.warn('processGroupMessage: groupId is empty/undefined');
      if (!userId) this.logger.warn('processGroupMessage: userId is empty/undefined');

      // Гарантируем регистрацию группы в БД (idempotent)
      try {
        await this.usersChatsService.addChat(String(groupId), chatTitle);
        this.logger.log(`processGroupMessage: addChat OK for ${groupId}`);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        this.logger.error(`processGroupMessage: addChat FAILED for ${groupId}: ${err}`);
      }

      // Фиксируем связь пользователь↔группа (idempotent внутри сервиса)
      // ВАЖНО: сохраняем по внутреннему UUID пользователя, а не по Telegram ID
      if (message.from) {
        const tgId = String(userId);
        const dbUser = await this.usersService.findOrCreate(tgId, {
          username: message.from.username || `${message.from.first_name || 'tg'}_${message.from.id}`,
          firstName: message.from.first_name || '',
        });
        try {
          await this.usersChatsService.setGroupToUser(String(dbUser.id), String(groupId));
          this.logger.log(`processGroupMessage: setGroupToUser OK userDbId=${dbUser.id} groupId=${groupId}`);
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          this.logger.error(`processGroupMessage: setGroupToUser FAILED userDbId=${dbUser.id} groupId=${groupId}: ${err}`);
        }
      } else {
        this.logger.warn('processGroupMessage: message.from is missing, cannot resolve user');
      }

      // Проверка команды /group
      // Принимаем варианты: /group, /group@botname и возможные аргументы
      const isGroup = this.isGroupChat(message.chat.type);
      const isGroupCmd = /^\/group(@\w+)?(?:\s|$)/.test(text || '');
      if (isGroup || isGroupCmd) {
        this.logger.log(`processGroupMessage: check /group match -> isGroup=${isGroup}, isGroupCmd=${isGroupCmd}, text="${(text || '').slice(0, 100)}"`);
      }
      if (isGroup && isGroupCmd) {
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
        this.logger.log(`handleGroupCommand: start admin check for userId=${message.from.id} in chatId=${message.chat.id}`);
        const isAdmin = await this.membershipService.checkAdminMembership(
          bot, 
          message.chat.id, 
          message.from.id
        );
        
        if (isAdmin) {
          this.logger.log(`handleGroupCommand: admin confirmed, sending groupId to user ${message.from.id}`);
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
        // Если добавлен сам бот — регистрируем группу
        try {
          const me = await bot.getMe();
          if (newMember.id === me.id && this.isGroupChat(message.chat.type)) {
            const chatTitle = message.chat.title || '';
            await this.usersChatsService.addChat(String(message.chat.id), chatTitle);
            this.logger.log(`Группа зарегистрирована (my_chat_member/new_chat_members): ${message.chat.id} (${chatTitle})`);
          }
        } catch (e) {
          this.logger.warn(`Не удалось обработать new_chat_members: ${e instanceof Error ? e.message : e}`);
        }
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