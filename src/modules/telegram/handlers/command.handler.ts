import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { ICommandHandler } from '../interfaces/message-handler.interface';
import { StateService } from '../services/state.service';
import { KeyboardService } from '../services/keyboard.service';
import { RegistrationService } from '../services/registration.service';
import { UsersService } from '../../users/users.service';
import { RolesService } from '../../../modules/roles/roles.service';

@Injectable()
export class StartCommandHandler implements ICommandHandler {
  command = '/start';

  constructor(
    private readonly stateService: StateService,
    private readonly keyboardService: KeyboardService,
    private readonly registrationService: RegistrationService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    if (!message.from) return;

    const chatId = message.chat.id.toString();
    const telegramId = message.from.id.toString();

    try {
      // Получаем или создаем пользователя
      const user = await this.usersService.findOrCreate(telegramId, {
        firstName: message.from.first_name || '',
        username: message.from.username || ''
      });

      // Проверяем статус регистрации
      const memberStatus = await this.registrationService.getMemberStatus(chatId);
      const userRole = await this.rolesService.getUserRoleForBot(user.id, botId) || 'user';
      
      // Сброс состояния
      await this.stateService.updateState(chatId, {
        text: undefined,
        reply_keyboard: undefined,
        inline_keyboard: undefined
      });

      if (memberStatus === 'approved' || this.registrationService.isAdmin(chatId)) {
        // Пользователь зарегистрирован
        const keyboardName = userRole === 'admin' ? 'adminsMenu' : 'mainMenu';
        await this.keyboardService.sendKeyboard(bot, chatId, keyboardName);
      } else if (memberStatus === 'pending') {
        // Заявка на рассмотрении
        await bot.sendMessage(
          chatId,
          '⏳ Ваша заявка на регистрацию находится на рассмотрении.\nОжидайте ответа от администратора.'
        );
      } else {
        // Требуется регистрация
        await this.stateService.updateState(chatId, {
          reply_keyboard: 'startRegistration'
        });

        await bot.sendMessage(
          chatId,
          '👋 Добро пожаловать!\n\n📝 Для использования бота необходимо зарегистрироваться.\nНажмите кнопку ниже, чтобы отправить свой контакт.',
          {
            reply_markup: this.keyboardService.createContactKeyboard() //TODO выяснить почему было stringify
           // reply_markup: JSON.stringify(this.keyboardService.createContactKeyboard()) 
          }
        );
      }
    } catch (error) {
      console.error('Ошибка в команде /start:', error);
      await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
    }
  }
}

@Injectable()
export class InfoCommandHandler implements ICommandHandler {
  command = '/info';

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    const chatId = message.chat.id;
    
    try {
      const botInfo = await bot.getMe();
      const infoText = `
🤖 **Информация о боте**

📋 **Имя:** ${botInfo.first_name}
🏷 **Username:** @${botInfo.username}
🆔 **ID:** ${botInfo.id}
✅ **Статус:** Активен

📊 **Возможности:**
• Регистрация пользователей
• Управление группами  
• Проверка участников
• Веб-приложение
• Административная панель

📞 **Поддержка:** Обратитесь к администратору
      `;

      await bot.sendMessage(chatId, infoText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка в команде /info:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения информации о боте.');
    }
  }
}

@Injectable()
export class StatusCommandHandler implements ICommandHandler {
  command = '/status';

  constructor(
    private readonly registrationService: RegistrationService,
    private readonly usersService: UsersService,
  ) {}

  async handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    if (!message.from) return;

    const chatId = message.chat.id.toString();
    const telegramId = message.from.id.toString();

    try {
      const memberStatus = await this.registrationService.getMemberStatus(chatId);
      const user = await this.usersService.findByTelegramId(telegramId);
      
      let statusText = '📊 **Ваш статус:**\n\n';
      
      if (memberStatus) {
        const statusEmoji = {
          'pending': '⏳',
          'approved': '✅',
          'rejected': '❌'
        };
        
        statusText += `${statusEmoji[memberStatus] || '❓'} Регистрация: ${memberStatus}\n`;
      } else {
        statusText += '❓ Регистрация: не найдена\n';
      }

      if (user) {
        statusText += `👤 ID пользователя: ${user.id}\n`;
        statusText += `📱 Telegram ID: ${telegramId}\n`;
      }

      if (this.registrationService.isAdmin(chatId)) {
        statusText += '👑 Права: Администратор\n';
      }

      await bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('Ошибка в команде /status:', error);
      await bot.sendMessage(chatId, '❌ Ошибка получения статуса.');
    }
  }
}