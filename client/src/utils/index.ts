// Общие утилиты для работы с Mini App

// Получить bot_id из URL параметров
export function getBotIdFromUrl(): number {
  const params = new URLSearchParams(window.location.search);
  const botIdStr = params.get('bot_id');
  return botIdStr ? parseInt(botIdStr, 10) : 1;
}

// Получить telegram_id из URL параметров или Telegram WebApp
export function getTelegramId(): number | null {
  // Сначала пробуем получить из Telegram WebApp
  const tg = (window as any).Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.id) {
    return tg.initDataUnsafe.user.id;
  }
  
  // Потом из URL параметров
  const params = new URLSearchParams(window.location.search);
  const telegramIdStr = params.get('telegram_id');
  return telegramIdStr ? parseInt(telegramIdStr, 10) : null;
}

// Получить URL с bot_id
export function getUrlWithBotId(path: string): string {
  const botId = getBotIdFromUrl();
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}bot_id=${botId}`;
}
