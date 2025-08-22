export const adminMainMenu = {
  type: 'replyKeyboard' as const,
  name: 'adminMainMenu',
  text: 'Вы в главном меню администратора',
  buttons: [
    {
      name: 'Заполнить/редактировать анкету',
      next: { inlineKeyboard: 'app' },
    },
    {
      name: 'Администрирование',
      next: { replyKeyboard: 'administration' },
    },
  ],
};
