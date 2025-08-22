import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InlineKeyboard } from '../classes/inline-keyboard.class';
import { IKeyboardConfig } from '../classes/keyboard.class';
import { ReplyKeyboard } from '../classes/reply-keyboard.class';
import { Text } from '../classes/text.class';
import { INavigationItem } from '../interfaces/navigation.interface';
import { usersMainMenu } from '../navigation/reply-keyboards/inline-keyboards/form/app';
import { adminMainMenu } from '../navigation/reply-keyboards/moderator/admin-main-menu';
import { administration } from '../navigation/reply-keyboards/moderator/administration';
// Импорты созданных элементов навигации
import { startRegistration } from '../navigation/reply-keyboards/user-registration/start-registration';

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);
  private tree: Record<string, INavigationItem> = {};
  private cash: Record<string, Record<string, unknown>> = {}; // Аналог cash из оригинала
  private pagesNavigator: Record<string, { page: number }> = {}; // Аналог pagesNavigator
  private readonly webAppUrl: string;
  private readonly adminId: string[];

  constructor(private readonly configService: ConfigService) {
    this.webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:3001');
    this.adminId = this.configService
      .get<string>('ADMIN_IDS', '')
      .split(',')
      .filter((id) => id.trim());
    this.generateTree();
  }

  private generateTree(): void {
    // Регистрируем созданные элементы навигации
    const keyboards: Record<string, IKeyboardConfig> = {
      startRegistration,
      adminMainMenu,
      usersMainMenu,
      administration,
      // Здесь будем добавлять остальные элементы по мере их создания
    };

    for (const [name, config] of Object.entries(keyboards)) {
      try {
        switch (config.type) {
          case 'replyKeyboard':
            this.tree[name] = new ReplyKeyboard(config) as unknown as INavigationItem;
            break;
          case 'inlineKeyboard':
            this.tree[name] = new InlineKeyboard(config) as unknown as INavigationItem;
            break;
          case 'text':
            this.tree[name] = new Text(config) as unknown as INavigationItem;
            break;
        }
      } catch (error) {
        this.logger.error(`Error creating ${name}:`, error);
      }
    }

    this.logger.log(`Navigation tree generated with ${Object.keys(this.tree).length} items`);
  }

  getNavigationItem(name: string): INavigationItem | null {
    return this.tree[name] || null;
  }

  getCash(chatId: string): Record<string, unknown> | undefined {
    return this.cash[chatId];
  }

  setCash(chatId: string, data: Record<string, unknown>): void {
    this.cash[chatId] = data;
  }

  clearCash(chatId: string): void {
    delete this.cash[chatId];
  }

  getPagesNavigator(chatId: string): { page: number } | undefined {
    return this.pagesNavigator[chatId];
  }

  setPagesNavigator(chatId: string, data: { page: number }): void {
    this.pagesNavigator[chatId] = data;
  }

  getTree(): Record<string, INavigationItem> {
    return this.tree;
  }

  getWebAppUrl(): string {
    return this.webAppUrl;
  }

  getAdminId(): string[] {
    return this.adminId;
  }

  // Метод для добавления элементов навигации (будем использовать для добавления новых элементов)
  addNavigationItem(name: string, config: IKeyboardConfig): void {
    try {
      switch (config.type) {
        case 'replyKeyboard':
          this.tree[name] = new ReplyKeyboard(config) as unknown as INavigationItem;
          break;
        case 'inlineKeyboard':
          this.tree[name] = new InlineKeyboard(config) as unknown as INavigationItem;
          break;
        case 'text':
          this.tree[name] = new Text(config) as unknown as INavigationItem;
          break;
      }
      this.logger.log(`Added navigation item: ${name}`);
    } catch (error) {
      this.logger.error(`Error adding navigation item ${name}:`, error);
    }
  }
}
