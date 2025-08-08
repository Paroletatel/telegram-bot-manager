import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Форматирует номер телефона в международный формат с скобками и дефисами,
 * аналогичный тому, как это происходит на фронте.
 *
 * @param rawPhoneNumber - Необработанный номер телефона.
 * @param defaultCountry - Код страны по умолчанию (например, "RU").
 * @returns Форматированный номер телефона в виде: +7 (123) 456-78-90
 */
export function formatPhoneNumber(
  rawPhoneNumber: string,
  defaultCountry: CountryCode = 'RU',
): string {
  try {
    const cleanPhone = rawPhoneNumber.trim(); // Убираем лишние пробелы и символы
    const phoneNumber = parsePhoneNumberFromString(cleanPhone, defaultCountry);

    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.formatInternational(); // Форматируем в международный формат
    }

    // Если номер недействителен, возвращаем исходный номер
    return rawPhoneNumber;
  } catch (error) {
    console.error('Ошибка при форматировании номера:', error);
    return rawPhoneNumber;
  }
}
