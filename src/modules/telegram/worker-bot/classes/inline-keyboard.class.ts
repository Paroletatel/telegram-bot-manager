import { Keyboard } from './keyboard.class';
import { ITelegramInlineKeyboard, ILongInlinePage, INavigationButton } from '../interfaces/navigation.interface';

export class InlineKeyboard extends Keyboard {
  private pagesNavigator: { [chatId: string]: ILongInlinePage } = {};

  getKeyboard(chatId: string, page?: number): ITelegramInlineKeyboard {
    const inlineButtons: Array<Array<{ 
      text: string; 
      callback_data?: string; 
      web_app?: { url: string } 
    }>> = [];

    let buttonsToShow: INavigationButton[];

    if (page) {
      const allButtons = this.pagesNavigator[chatId]?.buttons || [];
      buttonsToShow = allButtons.slice((page - 1) * 10, page * 10);
    } else {
      buttonsToShow = this.getButtonsForChat(chatId); // Используем метод из базового класса
    }

    for (const btn of buttonsToShow) {
      if (btn.appUrl) {
        inlineButtons.push([{ text: btn.name, web_app: { url: btn.appUrl } }]);
      } else {
        inlineButtons.push([{ text: btn.name, callback_data: btn.callbackData }]);
      }
    }

    if (page) {
      const paginationLine: Array<{ text: string; callback_data: string }> = [];
      if (page !== 1) paginationLine.push({ text: '◀️', callback_data: 'prev_page' });
      paginationLine.push({ text: `| ${page} |`, callback_data: '.' });
      if (page * 10 < this.pagesNavigator[chatId].buttons.length) {
        paginationLine.push({ text: '▶️', callback_data: 'next_page' });
      }
      inlineButtons.push(paginationLine);
    } else if (buttonsToShow.length > 10) {
      this.pagesNavigator[chatId] = { page: 1, buttons: buttonsToShow };
      const paginationLine: Array<{ text: string; callback_data: string }> = [];
      const displayButtons = inlineButtons.slice(0, 10);
      paginationLine.push({ text: '| 1 |', callback_data: '.' });
      paginationLine.push({ text: '▶️', callback_data: 'next_page' });
      displayButtons.push(paginationLine);
      return { inline_keyboard: displayButtons };
    }

    return { inline_keyboard: inlineButtons };
  }

  updatePage(chatId: string, direction: 'next' | 'prev'): void {
    if (!this.pagesNavigator[chatId]) return;
    
    if (direction === 'next') {
      this.pagesNavigator[chatId].page++;
    } else {
      this.pagesNavigator[chatId].page--;
    }
  }

  getPageNavigator(chatId: string): ILongInlinePage | undefined {
    return this.pagesNavigator[chatId];
  }

  // УБРАЛИ дублирующий метод getButtonsForChat - используем из базового класса
}