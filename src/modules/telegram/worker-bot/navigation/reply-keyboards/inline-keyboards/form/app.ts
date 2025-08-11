export const usersMainMenu = {
    type: 'inlineKeyboard' as const,
    name: 'usersMainMenu',
    text: 'Для перехода в приложение нажмите на кнопку',
    buttonsFabric: async (chatId: string) => {
      return [{
        name: `Перейти в меню`,
        callbackData: 'form',
        next: {},
        callback: async (chatId: string, userId: string) => {
        },
        appUrl: `${process.env.WEB_APP_URL}/usersMenu`
      }];
    },
    buttons: []
  };