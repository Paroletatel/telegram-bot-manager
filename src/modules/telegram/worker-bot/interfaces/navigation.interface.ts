export interface IBotState {
  chatId: string;
  text?: string | null; // ДОБАВИЛИ | null
  reply_keyboard?: string | null; // ДОБАВИЛИ | null
  inline_keyboard?: string | null; // ДОБАВИЛИ | null
  auth?: boolean;
}

export interface INavigationButton {
  name: string;
  next?: {
    replyKeyboard?: string;
    inlineKeyboard?: string;
    text?: string;
  };
  callback?: (chatId: string, data?: any) => Promise<void>;
  callbackData?: string;
  appUrl?: string;
}

export interface INavigationItem {
  type: "replyKeyboard" | "inlineKeyboard" | "text";
  name: string;
  text: string;
  buttons: INavigationButton[] | { [chatId: string]: INavigationButton[] };
  buttonsFabric?: (chatId: string, data?: any) => Promise<INavigationButton[]>;
  getKeyboard: (chatId: string, page?: number) => any;
  clickButton: (chatId: string, identifier: string) => Promise<any>;
  addButtons?: (chatId: string, data?: any) => Promise<void>;
  handleInput?: (chatId: string, input: string) => Promise<void | "error">;
  setPrev?: (name: string | null, chatId: string) => void;
  getPrev?: (chatId: string) => string | undefined;
}

export interface ITelegramKeyboard {
  keyboard?: Array<Array<{ text: string; web_app?: { url: string } }>>;
}

export interface ITelegramInlineKeyboard {
  inline_keyboard?: Array<
    Array<{
      text: string;
      callback_data?: string;
      web_app?: { url: string };
    }>
  >;
}

export interface ILongInlinePage {
  page: number;
  buttons: INavigationButton[];
}
