import { Injectable, Logger } from '@nestjs/common';
import { ReplyKeyboard } from '../classes/reply-keyboard.class';
import { InlineKeyboard } from '../classes/inline-keyboard.class';
import { Text } from '../classes/text.class';
import { ConfigService } from '@nestjs/config';
import { administration } from '../navigation/reply-keyboards/moderator/administration';

// Импорты созданных элементов навигации
import { startRegistration } from '../navigation/reply-keyboards/user-registration/start-registration';
import { adminMainMenu } from '../navigation/reply-keyboards/moderator/admin-main-menu';
import { usersMainMenu } from '../navigation/reply-keyboards/inline-keyboards/form/app';

@Injectable()
export class NavigationService {
  private readonly logger = new Logger(NavigationService.name);
  private tree: { [key: string]: any } = {};
  private cash: { [chatId: string]: any } = {}; // Аналог cash из оригинала
  private pagesNavigator: { [chatId: string]: any } = {}; // Аналог pagesNavigator
  private readonly webAppUrl: string;
  private readonly adminId: string[];

  constructor(private readonly configService: ConfigService) {
    this.webAppUrl = this.configService.get<string>('WEB_APP_URL', 'http://localhost:3001');
    this.adminId = (this.configService.get<string>('ADMIN_IDS', '')).split(',').filter(id => id.trim());
    this.generateTree();
  }

  private generateTree(): void {
    // Регистрируем созданные элементы навигации
    const keyboards = {
      startRegistration,
      adminMainMenu,
      usersMainMenu,
      administration,
      // Здесь будем добавлять остальные элементы по мере их создания
    };

    for (const [name, config] of Object.entries(keyboards)) {
      try {
        switch ((config as any).type) {
          case 'replyKeyboard':
            this.tree[name] = new ReplyKeyboard(config);
            break;
          case 'inlineKeyboard':
            this.tree[name] = new InlineKeyboard(config);
            break;
          case 'text':
            this.tree[name] = new Text(config);
            break;
        }
      } catch (error) {
        this.logger.error(`Error creating ${name}:`, error);
      }
    }

    this.logger.log(`Navigation tree generated with ${Object.keys(this.tree).length} items`);
  }

  getNavigationItem(name: string): any | null {
    return this.tree[name] || null;
  }

  getCash(chatId: string): any {
    return this.cash[chatId];
  }

  setCash(chatId: string, data: any): void {
    this.cash[chatId] = data;
  }

  clearCash(chatId: string): void {
    delete this.cash[chatId];
  }

  getPagesNavigator(chatId: string): any {
    return this.pagesNavigator[chatId];
  }

  setPagesNavigator(chatId: string, data: any): void {
    this.pagesNavigator[chatId] = data;
  }

  getTree(): { [key: string]: any } {
    return this.tree;
  }

  getWebAppUrl(): string {
    return this.webAppUrl;
  }

  getAdminId(): string[] {
    return this.adminId;
  }

  // Метод для добавления элементов навигации (будем использовать для добавления новых элементов)
  addNavigationItem(name: string, config: any): void {
    try {
      switch (config.type) {
        case 'replyKeyboard':
          this.tree[name] = new ReplyKeyboard(config);
          break;
        case 'inlineKeyboard':
          this.tree[name] = new InlineKeyboard(config);
          break;
        case 'text':
          this.tree[name] = new Text(config);
          break;
      }
      this.logger.log(`Added navigation item: ${name}`);
    } catch (error) {
      this.logger.error(`Error adding navigation item ${name}:`, error);
    }
  }
}