import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IBotState } from '../interfaces/bot.interface';

// Предполагаемая модель состояний
interface StateModel {
  chatId: string;
  text?: string;
  reply_keyboard?: string;
  inline_keyboard?: string;
  auth?: boolean;
  data?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(
    @InjectModel('States') private readonly statesModel: any, // Замените на вашу Sequelize модель
  ) {}

  async getState(chatId: string): Promise<IBotState | null> {
    try {
      const state = await this.statesModel.findOne({
        where: { chatId }
      });
      
      return state ? {
        chatId: state.chatId,
        text: state.text,
        reply_keyboard: state.reply_keyboard,
        inline_keyboard: state.inline_keyboard,
        auth: state.auth,
        data: state.data
      } : null;
    } catch (error) {
      this.logger.error(`Ошибка получения состояния для ${chatId}:`, error);
      return null;
    }
  }

  async updateState(chatId: string, updates: Partial<IBotState>): Promise<IBotState | null> {
    try {
      const [state, created] = await this.statesModel.findOrCreate({
        where: { chatId },
        defaults: {
          chatId,
          ...updates,
        }
      });

      if (!created) {
        await state.update(updates);
      }

      return {
        chatId: state.chatId,
        text: state.text,
        reply_keyboard: state.reply_keyboard,
        inline_keyboard: state.inline_keyboard,
        auth: state.auth,
        data: state.data
      };
    } catch (error) {
      this.logger.error(`Ошибка обновления состояния для ${chatId}:`, error);
      return null;
    }
  }

  async deleteState(chatId: string): Promise<boolean> {
    try {
      await this.statesModel.destroy({
        where: { chatId }
      });
      return true;
    } catch (error) {
      this.logger.error(`Ошибка удаления состояния для ${chatId}:`, error);
      return false;
    }
  }

  async updateOrCreateStateInline(chatId: string, keyboardName: string): Promise<void> {
    await this.updateState(chatId, {
      inline_keyboard: keyboardName,
      reply_keyboard: null
    });
  }
}