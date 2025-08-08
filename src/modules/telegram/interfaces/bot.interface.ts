import TelegramBot from 'node-telegram-bot-api';

export interface IBotInstance {
  id: string;
  name: string;
  token: string;
  bot: TelegramBot;
  isActive: boolean;
  createdAt: Date;
  lastActivity?: Date;
}

export interface IBotState {
  chatId: string;
  text?: string;
  reply_keyboard?: string;
  inline_keyboard?: string;
  auth?: boolean;
  data?: any;
}

export interface IBotCache {
  [chatId: string]: {
    userName?: string;
    currentPage?: number;
    formData?: any;
    tempData?: any;
  };
}

export interface IGroupInfo {
  chatId: string;
  chatName: string;
  isActive: boolean;
}