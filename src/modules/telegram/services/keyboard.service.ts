import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';

interface KeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

interface KeyboardConfig {
  text: string;
  buttons: KeyboardButton[][];
  addButtons?: (chatId: string) => Promise<void>;
  getKeyboard: (chatId: string) => { inline_keyboard: KeyboardButton[][] };
}

@Injectable()
export class KeyboardService {
  private readonly logger = new Logger(KeyboardService.name);
  private keyboards: { [key: string]: KeyboardConfig } = {};

  constructor() {
    this.initializeKeyboards();
  }

  private initializeKeyboards(): void {
    // Главное меню
    this.keyboards['mainMenu'] = {
      text: '🏠 Главное меню\n\nВыберите действие:',
      buttons: [
        [
          { text: '👤 Профиль', callback_data: 'profile' },
          { text: '⚙️ Настройки', callback_data: 'settings' }
        ],
        [
          { text: '📊 Статистика', callback_data: 'stats' },
          { text: '❓ Помощь', callback_data: 'help' }
        ]
      ],
      getKeyboard: (chatId: string) => ({
        inline_keyboard: this.keyboards['mainMenu'].buttons
      })
    };

    // Меню администратора
    this.keyboards['adminsMenu'] = {
      text: '👑 Панель администратора\n\nДоступные действия:',
      buttons: [
        [
          { text: '👥 Управление пользователями', callback_data: 'manage_users' },
          { text: '📊 Статистика', callback_data: 'admin_stats' }
        ],
        [
          { text: '💬 Управление группами', callback_data: 'manage_groups' },
          { text: '➕ Добавить группу', callback_data: 'addGroup' }
        ],
        [
          { text: '📋 Заявки на регистрацию', callback_data: 'pending_registrations' }
        ],
        [
          { text: '🔙 Назад', callback_data: 'back_to_main' }
        ]
      ],
      getKeyboard: (chatId: string) => ({
        inline_keyboard: this.keyboards['adminsMenu'].buttons
      })
    };

    // Меню регистрации
    this.keyboards['registrationMenu'] = {
      text: '📝 Регистрация\n\nДля продолжения работы необходимо зарегистрироваться.',
      buttons: [
        [
          { text: '📱 Отправить контакт', callback_data: 'request_contact' }
        ]
      ],
      getKeyboard: (chatId: string) => ({
        inline_keyboard: this.keyboards['registrationMenu'].buttons
      })
    };
  }

  getKeyboard(keyboardName: string): KeyboardConfig | null {
    return this.keyboards[keyboardName] || null;
  }

  async sendKeyboard(
    bot: TelegramBot, 
    chatId: string | number, 
    keyboardName: string,
    customText?: string
  ): Promise<void> {
    const keyboard = this.getKeyboard(keyboardName);
    if (!keyboard) {
      this.logger.warn(`Клавиатура ${keyboardName} не найдена`);
      return;
    }

    try {
      const text = customText || keyboard.text;
      const inlineKeyboard = keyboard.getKeyboard(chatId.toString());

      await bot.sendMessage(chatId, text, {
        reply_markup: inlineKeyboard,
        parse_mode: 'HTML'
      });
    } catch (error) {
      this.logger.error(`Ошибка отправки клавиатуры ${keyboardName}:`, error);
    }
  }

  createContactKeyboard(): TelegramBot.ReplyKeyboardMarkup {
    return {
      keyboard: [
        [{ text: '📱 Отправить контакт', request_contact: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };
  }

  removeKeyboard(): TelegramBot.ReplyKeyboardRemove {
    return { remove_keyboard: true };
  }
}