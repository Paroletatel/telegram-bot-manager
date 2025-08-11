export const administration = {
    type: 'replyKeyboard' as const,
    name: 'administration',
    text: 'Выберите пункт меню',
    backButton: 'yes' as const, // ДОБАВИЛИ as const
    buttons: [
      {
        name: 'Регистрация участников',
        next: { inlineKeyboard: 'membersRegistration', replyKeyboard: 'membersRegistrationBack' },
      },
      {
        name: 'Модерация анкет',
        next: { inlineKeyboard: 'formsModeration', replyKeyboard: 'formsModerationBack' },
      },
    ]
  };