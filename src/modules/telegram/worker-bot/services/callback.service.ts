import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { StateService } from './state.service';
import { NavigationService } from './navigation.service';
import { MessageService } from './message.service';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);

  constructor(
    private readonly stateService: StateService,
    private readonly navigationService: NavigationService,
    @Inject(forwardRef(() => MessageService))
    private readonly messageService: MessageService,
  ) {}

  async processCallback(
    bot: TelegramBot, 
    callbackQuery: TelegramBot.CallbackQuery,
    botId: string
  ): Promise<void> {
    try {
      const chatId = callbackQuery.message?.chat.id.toString();
      const callbackData = callbackQuery.data;
      const msgId = callbackQuery.message?.message_id;

      if (!chatId || !callbackData) return;

      // Проверяем, является ли это callback от новой системы ролей
      if (callbackData.startsWith('role_')) {
        return; // Пропускаем - обработается существующим обработчиком
      }

      // Обработка пагинации (из старого бота)
      if (callbackData === 'next_page' || callbackData === 'prev_page') {
        return await this.handlePagination(bot, callbackQuery, callbackData);
      }

      // Получаем текущее состояние
      const state = await this.stateService.getState(chatId);
      if (!state) return;

      const replyKeyboardNowName = state.reply_keyboard;
      const inlineKeyboardNowName = state.inline_keyboard;

      if (!inlineKeyboardNowName) return;

      const inlineKeyboardNow = this.navigationService.getNavigationItem(inlineKeyboardNowName);
      if (!inlineKeyboardNow) return;

      // Обрабатываем клик по кнопке
      const keyboardNextData = await inlineKeyboardNow.clickButton(chatId, callbackData);

      // ИСПРАВЛЕНО: Проверяем на undefined
      await this.executeCallbackNavigation(bot, chatId, keyboardNextData, replyKeyboardNowName || undefined);

      // Подтверждаем callback
      await bot.answerCallbackQuery(callbackQuery.id);

    } catch (error) {
      this.logger.error('Error processing callback:', error);
      if (callbackQuery.id) {
        await bot.answerCallbackQuery(callbackQuery.id, { text: 'Произошла ошибка' });
      }
    }
  }

  private async handlePagination(
    bot: TelegramBot, 
    callbackQuery: TelegramBot.CallbackQuery, 
    direction: string
  ): Promise<void> {
    const chatId = callbackQuery.message?.chat.id.toString();
    const msgId = callbackQuery.message?.message_id;

    if (!chatId || !msgId) return;

    const pagesNavigator = this.navigationService.getPagesNavigator(chatId);
    if (!pagesNavigator) return;

    const state = await this.stateService.getState(chatId);

    if (!state?.inline_keyboard) return;
    const inlineKeyboard = this.navigationService.getNavigationItem(state.inline_keyboard);

    if (!inlineKeyboard) return;

    let page = pagesNavigator.page;
    if (direction === 'next_page') {
      page += 1;
    } else {
      page -= 1;
    }

    // Обновляем номер страницы
    pagesNavigator.page = page;
    this.navigationService.setPagesNavigator(chatId, pagesNavigator);

    // Обновляем клавиатуру
    const newKeyboard = inlineKeyboard.getKeyboard(chatId, page);
    await bot.editMessageReplyMarkup(newKeyboard, {
      chat_id: chatId,
      message_id: msgId
    });
  }

  // ИСПРАВЛЕНО: Сделали параметр опциональным
  private async executeCallbackNavigation(
    bot: TelegramBot, 
    chatId: string, 
    actions: any,
    currentReplyKeyboard?: string
  ): Promise<void> {
    for (const [actionType, targetName] of Object.entries(actions)) {
      if (!targetName) continue;

      const target = this.navigationService.getNavigationItem(targetName as string);
      if (!target) continue;

      switch (actionType) {
        case 'replyKeyboard':
          await this.stateService.updateOrCreateState(chatId, targetName as string);
          
          if (currentReplyKeyboard && target.name !== 'adminMainMenu' && target.name !== 'usersMainMenu') {
            target.setPrev(currentReplyKeyboard, chatId);
          } else {
            target.setPrev(null, chatId);
          }

          await bot.sendMessage(chatId, target.text, {
            reply_markup: (target.getKeyboard(chatId))
          });
          break;

        case 'inlineKeyboard':
          await this.stateService.updateOrCreateStateInline(chatId, targetName as string);
          if (target.addButtons) {
            await target.addButtons(chatId);
          }
          await bot.sendMessage(chatId, target.text, {
            reply_markup: (target.getKeyboard(chatId))
          });
          break;

        case 'text':
          await this.stateService.updateState(chatId, { text: targetName as string });
          await bot.sendMessage(chatId, target.text);
          break;
      }
    }
  }
}