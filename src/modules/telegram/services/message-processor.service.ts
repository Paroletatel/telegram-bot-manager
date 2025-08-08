import { Injectable, Logger } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { StateService } from './state.service';
import { GroupService } from './group.service';
import { IMessageHandler, ICallbackHandler, ICommandHandler } from '../interfaces/message-handler.interface';

@Injectable()
export class MessageProcessorService {
  private readonly logger = new Logger(MessageProcessorService.name);
  private messageHandlers: IMessageHandler[] = [];
  private callbackHandlers: ICallbackHandler[] = [];
  private commandHandlers: Map<string, ICommandHandler> = new Map();

  constructor(
    private readonly stateService: StateService,
    private readonly groupService: GroupService,
  ) {}

  registerMessageHandler(handler: IMessageHandler): void {
    this.messageHandlers.push(handler);
    this.messageHandlers.sort((a, b) => b.priority - a.priority);
    this.logger.log(`Зарегистрирован обработчик сообщений с приоритетом ${handler.priority}`);
  }

  registerCallbackHandler(handler: ICallbackHandler): void {
    this.callbackHandlers.push(handler);
    this.logger.log('Зарегистрирован обработчик callback-запросов');
  }

  registerCommandHandler(handler: ICommandHandler): void {
    this.commandHandlers.set(handler.command, handler);
    this.logger.log(`Зарегистрирован обработчик команды ${handler.command}`);
  }

  async processMessage(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    try {
      const chatId = message.chat.id.toString();
      const chatType = message.chat.type;

      // Обработка новых участников группы
      if (message.new_chat_members) {
        await this.groupService.handleNewChatMembers(bot, message);
        return;
      }

      // Обработка команды /group в группах
      if (message.text === '/group' && (chatType === 'group' || chatType === 'supergroup')) {
        await this.handleGroupCommand(bot, message);
        return;
      }

      // Обработка сообщений в группах (только если группа зарегистрирована)
      if ((chatType === 'group' || chatType === 'supergroup') && this.groupService.isRegisteredGroup(chatId)) {
        await this.handleGroupMessage(bot, message, botId);
        return;
      }

      // Обрабатываем только личные сообщения
      if (chatType !== 'private') return;

      // Получаем состояние пользователя
      const state = await this.stateService.getState(chatId);

      // Обработка команд
      if (message.text && message.text.startsWith('/')) {
        const command = message.text.split(' ')[0];
        const handler = this.commandHandlers.get(command);
        
        if (handler) {
          await handler.handle(bot, message, botId);
          return;
        }
      }

      // Обработка обычных сообщений через зарегистрированные обработчики
      for (const handler of this.messageHandlers) {
        if (handler.canHandle(message, state)) {
          await handler.handle(bot, message, botId, state);
          return;
        }
      }

      // Если никто не обработал сообщение
      await this.handleUnknownMessage(bot, message);

    } catch (error) {
      this.logger.error('Ошибка обработки сообщения:', error);
      await bot.sendMessage(message.chat.id, '❌ Произошла ошибка при обработке сообщения');
    }
  }

  async processCallback(bot: TelegramBot, query: TelegramBot.CallbackQuery, botId: string): Promise<void> {
    try {
      if (!query.data) return;

      for (const handler of this.callbackHandlers) {
        if (handler.canHandle(query.data)) {
          await handler.handle(bot, query, botId);
          return;
        }
      }

      // Если никто не обработал callback
      await bot.answerCallbackQuery(query.id, { text: 'Неизвестная команда' });

    } catch (error) {
      this.logger.error('Ошибка обработки callback:', error);
      try {
        await bot.answerCallbackQuery(query.id, { text: 'Произошла ошибка' });
      } catch (e) {
        // Игнорируем ошибки отправки ответа на callback
      }
    }
  }

  private async handleGroupCommand(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
    if (!message.from) return;

    const chatId = message.chat.id.toString();
    
    try {
      const chatMember = await bot.getChatMember(chatId, message.from.id);
      if (chatMember.status === 'administrator' || chatMember.status === 'creator') {
        await bot.sendMessage(
          message.from.id,
          `ID группы: \`${chatId}\`\n\nИспользуйте этот ID для добавления группы в систему.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      this.logger.error('Ошибка обработки команды /group:', error);
    }
  }

  private async handleGroupMessage(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void> {
    if (!message.from || !message.text) return;

    // Здесь можно добавить логику обработки сообщений в группах
    // Например, модерацию, статистику и т.д.
    this.logger.debug(`Сообщение в группе ${message.chat.id} от ${message.from.id}: ${message.text}`);
  }

  private async handleUnknownMessage(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
    const chatId = message.chat.id;
    
    if (message.text) {
      await bot.sendMessage(
        chatId,
        '❓ Не понимаю эту команду. Используйте /start для возврата в главное меню.'
      );
    }
  }
}