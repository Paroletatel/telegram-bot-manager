export const usersMainMenu = {
  type: 'inlineKeyboard' as const,
  name: 'usersMainMenu',
  text: 'Для перехода в приложение нажмите на кнопку',
  buttonsFabric: async (_chatId: string) => {
    return [
      {
        name: `Перейти в меню`,
        callbackData: 'form',
        next: {},
        callback: async (_chatId: string, _userId?: string) => {},
        appUrl: `${process.env.WEB_APP_URL}/usersMenu`,
      },
    ];
  },
  buttons: [],
};
