/**
 * Общие типы для JWT токенов, используемые в бэкенде и фронтенде
 */

/**
 * Интерфейс для JWT payload, соответствующий структуре токена
 */
export interface JwtPayload {
  sub: string;     // Идентификатор пользователя
  username: string; // Имя пользователя
  role: string;    // Роль пользователя (admin или user)
  botId: string;   // Идентификатор бота
  exp: number;     // Время истечения токена
  iat?: number;    // Время создания токена (опционально)
  [key: string]: unknown; // Другие возможные поля
}

/**
 * Тип для токенов авторизации
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
