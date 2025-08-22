export interface ITextConfig {
  text: string;
  handler?: (chatId: string, input: string) => Promise<void | 'error'>;
  next?: {
    replyKeyboard?: string;
    inlineKeyboard?: string;
    text?: string;
  };
  name: string;
}

export class Text {
  public type: string = 'text';
  public text: string;
  public handler?: (chatId: string, input: string) => Promise<void | 'error'>;
  public next: {
    replyKeyboard?: string;
    inlineKeyboard?: string;
    text?: string;
  };
  public name: string;

  constructor(config: ITextConfig) {
    this.text = config.text;
    this.handler = config.handler;
    this.next = config.next || {};
    this.name = config.name;
  }

  async handleInput(chatId: string, input: string): Promise<void | 'error'> {
    if (this.handler) {
      return await this.handler(chatId, input);
    }
  }
}
