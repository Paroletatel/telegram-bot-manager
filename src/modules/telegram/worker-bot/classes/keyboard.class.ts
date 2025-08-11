import { INavigationButton } from '../interfaces/navigation.interface';

export interface IKeyboardConfig {
  type: string;
  name: string;
  buttons: INavigationButton[] | { [chatId: string]: INavigationButton[] };
  text: string;
  buttonsFabric?: (chatId: string, data?: any) => Promise<INavigationButton[]>;
  backButton?: 'yes' | 'no';
  canBePrev?: 'yes' | 'no';
  withInlineKeyboard?: string;
  handler?: (chatId: string, input: string) => Promise<void | 'error'>;
  next?: {
    replyKeyboard?: string;
    inlineKeyboard?: string;
    text?: string;
  };
}

export class Keyboard {
  public type: string;
  public name: string;
  public buttons: INavigationButton[] | { [chatId: string]: INavigationButton[] };
  public text: string;
  public prev: { [chatId: string]: string } = {};
  public buttonsFabric?: (chatId: string, data?: any) => Promise<INavigationButton[]>;
  public backButton?: 'yes' | 'no';
  public canBePrev?: 'yes' | 'no';
  public withInlineKeyboard?: string;
  public handler?: (chatId: string, input: string) => Promise<void | 'error'>;
  public next?: {
    replyKeyboard?: string;
    inlineKeyboard?: string;
    text?: string;
  };

  constructor(keyboard: IKeyboardConfig) {
    this.type = keyboard.type;
    this.name = keyboard.name;
    this.buttons = keyboard.buttons;
    this.text = keyboard.text;
    this.buttonsFabric = keyboard.buttonsFabric;
    this.backButton = keyboard.backButton;
    this.canBePrev = keyboard.canBePrev;
    this.withInlineKeyboard = keyboard.withInlineKeyboard;
    this.handler = keyboard.handler;
    this.next = keyboard.next;
  }

  async addButtons(chatId: string, data?: any): Promise<void> {
    if (this.buttonsFabric) {
      if (!this.buttons || typeof this.buttons !== 'object') {
        this.buttons = {};
      }
      (this.buttons as { [chatId: string]: INavigationButton[] })[chatId] = await this.buttonsFabric(chatId, data);
    }
  }

  setPrev(name: string | null, chatId: string): void {
    if (name) {
      this.prev[chatId] = name;
    } else {
      delete this.prev[chatId];
    }
  }

  getPrev(chatId: string): string | undefined {
    return this.prev[chatId];
  }

  async clickButton(chatId: string, name: string): Promise<{
    replyKeyboard?: string;
    inlineKeyboard?: string;
    text?: string;
  }> {
    let button: INavigationButton | null = null;
    
    // Определяем откуда брать кнопки
    const buttonsArray = this.getButtonsForChat(chatId);
    
    if (buttonsArray) {
      button = buttonsArray.find(btn => btn.name === name) || null;
      if (!button && buttonsArray[0]?.callbackData) {
        button = buttonsArray.find(btn => btn.callbackData === name) || null;
      }
    }

    if (!button) return {};
    
    if (button.callback) {
      await button.callback(chatId, name);
    }
    
    return button.next || {};
  }

  // ИЗМЕНЕНО: с private на protected
  protected getButtonsForChat(chatId: string): INavigationButton[] {
    if (Array.isArray(this.buttons)) {
      return this.buttons;
    } else if (this.buttons && typeof this.buttons === 'object') {
      return (this.buttons as { [chatId: string]: INavigationButton[] })[chatId] || [];
    }
    return [];
  }

  // Абстрактный метод, будет реализован в наследниках
  getKeyboard(chatId: string, page?: number): { 
    keyboard?: Array<Array<{ text: string; web_app?: { url: string } }>>;
    inline_keyboard?: Array<Array<{ text: string; callback_data?: string; web_app?: { url: string } }>>;
  } {
    return {};
  }
}