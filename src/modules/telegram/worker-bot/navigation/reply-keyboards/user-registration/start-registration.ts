export const startRegistration = {
    type: 'replyKeyboard' as const,
    name: 'startRegistration',
    text: 'Здравствуйте! Для регистрации предоставьте свой номер телефона с помощью кнопки',
    buttons: [
      {
        name: 'Отправить мой номер телефона',
        next: {},
      },
    ]
  };