import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { States } from '../../../../models/states.model';
import { IBotState } from '../interfaces/navigation.interface';

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  constructor(@InjectModel(States) private readonly statesModel: typeof States) {}

  async updateOrCreateState(chatId: string, keyboardName: string): Promise<void> {
    try {
      await this.statesModel.upsert({
        chatId,
        reply_keyboard: keyboardName,
        inline_keyboard: null,
        text: null,
      });
    } catch (error) {
      this.logger.error(`Error updating state for ${chatId}:`, error);
    }
  }

  async updateOrCreateStateInline(chatId: string, keyboardName: string): Promise<void> {
    try {
      await this.statesModel.upsert({
        chatId,
        reply_keyboard: null, // ИСПРАВЛЕНО: null вместо undefined
        inline_keyboard: keyboardName,
        text: null, // ИСПРАВЛЕНО: null вместо undefined
      });
    } catch (error) {
      this.logger.error(`Error updating inline state for ${chatId}:`, error);
    }
  }

  async getState(chatId: string): Promise<IBotState | null> {
    try {
      const state = await this.statesModel.findOne({
        where: { chatId },
      });
      return state ? state.toJSON() : null;
    } catch (error) {
      this.logger.error(`Error getting state for ${chatId}:`, error);
      return null;
    }
  }

  async updateStatePrev(chatId: string, keyboardNextName: string): Promise<void> {
    try {
      await this.statesModel.update(
        {
          reply_keyboard: keyboardNextName,
          inline_keyboard: null, // ИСПРАВЛЕНО: null вместо undefined
          text: null, // ИСПРАВЛЕНО: null вместо undefined
        },
        {
          where: { chatId },
        },
      );
    } catch (error) {
      this.logger.error(`Error updating prev state for ${chatId}:`, error);
    }
  }

  async updateState(chatId: string, updates: Partial<States>): Promise<void> {
    // ИСПРАВЛЕНО: Partial<States>
    try {
      await this.statesModel.update(updates, {
        where: { chatId },
      });
    } catch (error) {
      this.logger.error(`Error updating custom state for ${chatId}:`, error);
    }
  }
}
