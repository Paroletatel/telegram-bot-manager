import { Keyboard } from './keyboard.class';
import { ITelegramKeyboard } from '../interfaces/navigation.interface';

export class ReplyKeyboard extends Keyboard {
  getKeyboard(chatId: string): ITelegramKeyboard {
    const finalButtons: Array<Array<{ text: string; web_app?: { url: string } }>> = [];
    const buttonsArray = this.getButtonsForChat(chatId); // Используем метод из базового класса
    
    for (const btn of buttonsArray) {
      if (btn.appUrl) {
        finalButtons.push([{ text: btn.name, web_app: { url: btn.appUrl } }]);
      } else {
        finalButtons.push([{ text: btn.name }]);
      }
    }

    if (this.backButton === 'yes' && this.prev[chatId]) {
      finalButtons.push([{ text: 'Назад' }]);
    }

    return { keyboard: finalButtons };
  }

  // УБРАЛИ дублирующий метод getButtonsForChat - используем из базового класса
}