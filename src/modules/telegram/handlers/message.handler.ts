import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { IMessageHandler } from '../interfaces/message-handler.interface';
import { StateService } from '../services/state.service';
import { RegistrationService } from '../services/registration.service';
import { GroupService } from '../services/group.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class ContactHandler implements IMessageHandler {
  priority = 10;
  
  constructor(
    private readonly stateService: StateService,
    private readonly registrationService: RegistrationService,
    private readonly usersService: UsersService,
  ) {}

  canHandle(message: TelegramBot.Message, state?: any): boolean {
    return !!(message.contact && state?.reply_keyboard === 'startRegistration');
  }

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string, state?: any): Promise<void> {
    if (!message.contact || !message.from) return;

    const chatId = message.chat.id.toString();
    const contact = message.contact;

    try {
      await this.registrationService.createNewMember({
        chatId,
        phoneNumber: contact.phone_number,
        fullName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
        firstName: contact.first_name || '',
        lastName: contact.last_name || '',
        username: message.chat.username || undefined
      });

      if (this.registrationService.isAdmin(chatId)) {
        await this.registrationService.setNumberStatus(contact.phone_number, 'approved' as any);
        await this.registrationService.setMessageStatus(chatId);
        await this.registrationService.continueRegistration(chatId);
        await this.registrationService.registrationAdmin(chatId);
        
        await this.stateService.updateState(chatId, {
          auth: true,
          reply_keyboard: undefined,
          inline_keyboard: 'adminsMenu'
        });

        await bot.sendMessage(chatId, '✅ Добро пожаловать, администратор!');
      } else {
        await bot.sendMessage(chatId, '📋 Ваша заявка на регистрацию отправлена на рассмотрение.');
      }
    } catch (error) {
      console.error('Ошибка обработки контакта:', error);
      await bot.sendMessage(chatId, '❌ Произошла ошибка при регистрации. Попробуйте позже.');
    }
  }
}

@Injectable()
export class GroupCommandHandler implements IMessageHandler {
  priority = 5;

  constructor(private readonly groupService: GroupService) {}

  canHandle(message: TelegramBot.Message): boolean {
    const isGroupCommand = message.text === '/group';
    const isGroupChat = message.chat.type === 'group' || message.chat.type === 'supergroup';
    return isGroupCommand && isGroupChat;
  }

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    if (!message.from) return;

    const chatId = message.chat.id.toString();
    const userId = message.from.id.toString();

    // Проверяем права администратора (можно улучшить проверку)
    try {
      const chatMember = await bot.getChatMember(chatId, message.from.id);
      if (chatMember.status !== 'administrator' && chatMember.status !== 'creator') {
        return; // Не администратор
      }

      await bot.sendMessage(
        message.from.id,
        `ID группы: \`${chatId}\`\nНажмите на кнопку добавления и отправьте этот ID, если хотите добавить эту группу.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Ошибка обработки команды /group:', error);
    }
  }
}

@Injectable()
export class AddGroupHandler implements IMessageHandler {
  priority = 8;

  constructor(
    private readonly stateService: StateService,
    private readonly groupService: GroupService,
  ) {}

  canHandle(message: TelegramBot.Message, state?: any): boolean {
    return !!(state?.text === 'addGroup' && message.text && message.text !== '/start');
  }

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    if (!message.text) return;

    const chatId = message.chat.id.toString();
    const groupId = message.text.trim();

    try {
      const chat = await bot.getChat(groupId);
      
      if (chat && (chat.type === 'group' || chat.type === 'supergroup')) {
        const success = await this.groupService.addGroup(groupId, chat.title || 'Unnamed Group');
        
        if (success) {
          await bot.sendMessage(chatId, `✅ Группа "${chat.title}" добавлена`);
          await this.groupService.refreshGroups();
          
          // Возвращаемся в главное меню
          await this.stateService.updateState(chatId, {
            text: undefined,
            reply_keyboard: undefined
          });
          
          await bot.sendMessage(chatId, 'Используйте /start для возврата в меню');
        } else {
          await bot.sendMessage(chatId, '❌ Не удалось добавить группу');
        }
      } else {
        await bot.sendMessage(chatId, '❌ Пришлите ID группы');
      }
    } catch (error) {
      console.error('Ошибка добавления группы:', error);
      await bot.sendMessage(chatId, '❌ Не удалось добавить группу. Проверьте ID.');
    }
  }
}

@Injectable()
export class NewChatMembersHandler implements IMessageHandler {
  priority = 15;

  constructor(private readonly groupService: GroupService) {}

  canHandle(message: TelegramBot.Message): boolean {
    return !!(message.new_chat_members && message.new_chat_members.length > 0);
  }

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    await this.groupService.handleNewChatMembers(bot, message);
  }
}