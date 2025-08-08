import TelegramBot from 'node-telegram-bot-api';

export interface IMessageHandler {
  canHandle(message: TelegramBot.Message, state?: any): boolean;
  handle(bot: TelegramBot, message: TelegramBot.Message, botId: string, state?: any): Promise<void>;
  priority: number; // Чем выше число, тем выше приоритет
}

export interface ICallbackHandler {
  canHandle(callbackData: string): boolean;
  handle(bot: TelegramBot, query: TelegramBot.CallbackQuery, botId: string): Promise<void>;
}

export interface ICommandHandler {
  command: string;
  handle(bot: TelegramBot, message: TelegramBot.Message, botId: string): Promise<void>;
}