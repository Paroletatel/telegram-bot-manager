export function getCurrentHourInTimezone(timezone: string) {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000; // Получаем текущее время в UTC
    let localTime = 0;
    if (!timezone) {
      localTime = utc;
    } else {
      localTime = utc + Number(timezone) * 3600000; // Добавляем смещение часового пояса в миллисекундах
    }
    const currentTime = new Date(localTime);
    const hour = currentTime.getHours();
    const minutes = currentTime.getMinutes();
  
    return { hour, minutes };
  }