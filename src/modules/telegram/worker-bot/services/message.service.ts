import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';

import { RolesService } from '../../../roles/roles.service';
import { UsersService } from '../../../users/users.service';
import {
  IBotState,
  ITelegramInlineKeyboard,
  ITelegramKeyboard,
  NavigationActions,
} from '../interfaces/navigation.interface';
import { CallbackService } from './callback.service';
import { NavigationService } from './navigation.service';
import { StateService } from './state.service';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly stateService: StateService,
    private readonly navigationService: NavigationService,
    @Inject(forwardRef(() => CallbackService))
    private readonly callbackService: CallbackService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => RolesService))
    private readonly rolesService: RolesService,
  ) {}

  // Type guards to avoid any when checking reply/inline keyboards
  private hasInlineKeyboard(obj: unknown): obj is ITelegramInlineKeyboard {
    return !!obj && typeof obj === 'object' && 'inline_keyboard' in (obj as Record<string, unknown>);
  }

  private hasReplyKeyboard(obj: unknown): obj is ITelegramKeyboard {
    return !!obj && typeof obj === 'object' && 'keyboard' in (obj as Record<string, unknown>);
  }

  async processMessage(
    bot: TelegramBot,
    message: TelegramBot.Message,
    botId: string,
  ): Promise<void> {
    try {
      const chatId = message.chat.id.toString();
      const text = message.text;

      // Сначала проверяем, не является ли это одной из существующих команд
      if (text && this.isExistingBotCommand(text)) {
        return; // Пропускаем - обработается существующими обработчиками
      }

      // Получаем состояние пользователя из старой системы навигации
      const state = await this.stateService.getState(chatId);

      // Обработка команды /start (интеграция с новой и старой системой)
      if (text === '/start') {
        return await this.handleStartCommand(bot, message, botId, state);
      }

      // Обработка контактов для регистрации (из старого бота)
      if (message.contact && state?.reply_keyboard === 'startRegistration') {
        return await this.handleContactRegistration(bot, message, botId);
      }

      // Кэширование имени пользователя для messageDetails (из старого бота)
      if (state?.reply_keyboard === 'messageDetails') {
        const existingCash = this.navigationService.getCash(chatId) || {};
        existingCash.userName = message.from?.username;
        this.navigationService.setCash(chatId, existingCash);
      }

      // Основная обработка через старую систему навигации
      await this.processOldNavigation(bot, chatId, text || '', state);
    } catch (error) {
      this.logger.error('Error processing message:', error);
      await bot.sendMessage(message.chat.id, 'Извините, произошла ошибка');
      // Fallback на команду /start
      await this.handleStartCommand(bot, message, botId, null);
    }
  }

  private isExistingBotCommand(text: string): boolean {
    const existingCommands = ['/webapp', '/role', '/ping', '/info', '/admin'];
    const command = text.split(' ')[0];
    return existingCommands.includes(command);
  }

  async handleStartCommand(
    bot: TelegramBot,
    message: TelegramBot.Message,
    botId: string,
    state: IBotState | null,
  ): Promise<void> {
    const chatId = message.chat.id.toString();

    try {
      // Создаем/получаем пользователя для новой системы
      const user = await this.usersService.findOrCreate(message.from?.id.toString() || chatId, {
        firstName: message.from?.first_name || '',
        username: message.from?.username || '',
      });

      const userRole = (await this.rolesService.getUserRoleForBot(user.id, botId)) || 'user';

      // Проверяем, является ли пользователь администратором из старой системы
      const adminIds = this.navigationService.getAdminId();
      const isOldAdmin = adminIds.includes(chatId);

      if (isOldAdmin && state && state.auth !== false) {
        // Администратор из старой системы - показываем админское меню
        const adminMenu = this.navigationService.getNavigationItem('adminMainMenu');
        if (adminMenu) {
          await this.stateService.updateOrCreateStateInline(chatId, 'adminMainMenu');
          if (adminMenu.addButtons) {
            await adminMenu.addButtons(chatId);
          }
          // ИСПРАВЛЕНО: формируем корректный reply_markup без any
          const markup = adminMenu.getKeyboard(chatId);
          const options: TelegramBot.SendMessageOptions = {};
          if (this.hasInlineKeyboard(markup)) {
            options.reply_markup = markup as unknown as TelegramBot.InlineKeyboardMarkup;
          } else if (this.hasReplyKeyboard(markup)) {
            options.reply_markup = markup as unknown as TelegramBot.ReplyKeyboardMarkup;
          }
          await bot.sendMessage(chatId, adminMenu.text, options);
          return; // Завершаем выполнение функции
        }
      }

      // Обычный пользователь или новый пользователь - проверяем регистрацию
      // TODO: Здесь будет логика проверки регистрации из старого бота

      // Пока показываем стандартное приветствие с интеграцией старой и новой системы
      const welcomeMessage =
        `👋 Добро пожаловать!\n\n` +
        `🆕 Новые функции:\n` +
        `Ваша роль: ${userRole === 'admin' ? '👑 Администратор' : '👤 Пользователь'}\n` +
        `/webapp - Веб-приложение\n` +
        `/role - Переключить роль\n` +
        `/info - Информация о боте\n\n` +
        `📋 Основные функции:\n` +
        `Здесь будут функции из старого бота...`;

      // ИСПРАВЛЕНО: убрали return
      await bot.sendMessage(chatId, welcomeMessage);
    } catch (error) {
      this.logger.error('Error in handleStartCommand:', error);
      await bot.sendMessage(chatId, 'Произошла ошибка при запуске');
    }
  }
  private async processOldNavigation(
    bot: TelegramBot,
    chatId: string,
    text: string,
    state: IBotState | null,
  ): Promise<void> {
    if (!state) return;

    const replyKeyboardName = state.reply_keyboard;
    const textName = state.text;

    const replyKeyboard = replyKeyboardName
      ? this.navigationService.getNavigationItem(replyKeyboardName)
      : undefined;
    const textHandler = textName ? this.navigationService.getNavigationItem(textName) : undefined;

    // Обработка кнопки "Назад"
    if (text === 'Назад' && replyKeyboard) {
      const prevName = replyKeyboard.getPrev ? replyKeyboard.getPrev(chatId) : undefined;
      if (prevName) {
        await this.stateService.updateStatePrev(chatId, prevName);
        return await this.navigateToKeyboard(bot, chatId, prevName);
      }
    }

    let nextActions = {};

    // Обработка через reply keyboard
    if (replyKeyboard) {
      nextActions = await replyKeyboard.clickButton(chatId, text);
    }

    // Обработка через text handler
    if (textHandler && Object.keys(nextActions).length === 0) {
      const result = textHandler.handleInput ? await textHandler.handleInput(chatId, text) : undefined;
      if (result === 'error') return;
      nextActions = textHandler.next || {};
    }

    // Выполняем переходы
    await this.executeNavigation(bot, chatId, nextActions, replyKeyboardName ?? undefined);
  }

  private async executeNavigation(
    bot: TelegramBot,
    chatId: string,
    actions: NavigationActions | {},
    currentKeyboard?: string,
  ): Promise<void> {
    for (const [actionType, targetName] of Object.entries(actions)) {
      if (!targetName) continue;

      const target = this.navigationService.getNavigationItem(targetName as string);
      if (!target) continue;

      switch (actionType) {
        case 'replyKeyboard':
          await this.stateService.updateOrCreateState(chatId, targetName as string);
          if (
            currentKeyboard &&
            target.name !== 'adminMainMenu' &&
            target.name !== 'usersMainMenu'
          ) {
            target.setPrev && target.setPrev(currentKeyboard, chatId);
          }
          {
            const markup = target.getKeyboard(chatId);
            const options: TelegramBot.SendMessageOptions = {};
            if (this.hasReplyKeyboard(markup)) {
              options.reply_markup = markup as unknown as TelegramBot.ReplyKeyboardMarkup;
            }
            await bot.sendMessage(chatId, target.text, options);
          }
          break;

        case 'inlineKeyboard':
          await this.stateService.updateOrCreateStateInline(chatId, targetName as string);
          if (target.addButtons) {
            await target.addButtons(chatId);
          }
          {
            const markup = target.getKeyboard(chatId);
            const options: TelegramBot.SendMessageOptions = {};
            if (this.hasInlineKeyboard(markup)) {
              options.reply_markup = markup as unknown as TelegramBot.InlineKeyboardMarkup;
            }
            await bot.sendMessage(chatId, target.text, options);
          }
          break;

        case 'text':
          await this.stateService.updateState(chatId, { text: targetName as string });
          await bot.sendMessage(chatId, target.text);
          break;
      }
    }
  }

  private async navigateToKeyboard(
    bot: TelegramBot,
    chatId: string,
    targetName: string,
  ): Promise<void> {
    const target = this.navigationService.getNavigationItem(targetName);
    if (!target) return;

    // Обработка клавиатуры с inline клавиатурой
    if (target.withInlineKeyboard) {
      await this.stateService.updateState(chatId, {
        inline_keyboard: target.withInlineKeyboard,
        reply_keyboard: target.name,
      });

      const inlineTarget = this.navigationService.getNavigationItem(target.withInlineKeyboard);
      if (inlineTarget) {
        if (inlineTarget.addButtons) {
          await inlineTarget.addButtons(chatId);
        }
        // ИСПРАВЛЕНО: убрали return
        {
          const markup = inlineTarget.getKeyboard(chatId);
          const options: TelegramBot.SendMessageOptions = {};
          if (this.hasInlineKeyboard(markup)) {
            options.reply_markup = markup as unknown as TelegramBot.InlineKeyboardMarkup;
          }
          await bot.sendMessage(chatId, inlineTarget.text, options);
        }
      }
    }

    // Проверка на отсутствие кнопок
    let hasButtons = false;
    if (Array.isArray(target.buttons)) {
      hasButtons = target.buttons.length > 0;
    } else if (target.buttons && typeof target.buttons === 'object') {
      const arr = target.buttons[chatId] || [];
      hasButtons = Array.isArray(arr) && arr.length > 0;
    }
    if (!hasButtons && !target.canBePrev) {
      // ИСПРАВЛЕНО: убрали return
      await this.processOldNavigation(
        bot,
        chatId,
        'Назад',
        await this.stateService.getState(chatId),
      );
      return;
    }

    // ИСПРАВЛЕНО: убрали return
    {
      const markup = target.getKeyboard(chatId);
      const options: TelegramBot.SendMessageOptions = {};
      if (this.hasReplyKeyboard(markup)) {
        options.reply_markup = markup as unknown as TelegramBot.ReplyKeyboardMarkup;
      }
      await bot.sendMessage(chatId, target.text, options);
    }
  }

  private async handleContactRegistration(
    _bot: TelegramBot,
    _message: TelegramBot.Message,
    _botId: string,
  ): Promise<void> {
    // TODO: Реализовать логику регистрации из старого бота
    this.logger.log('Contact registration handler - to be implemented');
  }
}
