// Простой in-memory cache для Bot instances
// Используется для webhook — чтобы не создавать Bot на каждый запрос
import { Bot } from 'grammy';

// Cache: botId → Bot instance
const botCache = new Map<number, Bot>();

/**
 * Получить или создать Bot instance для webhook
 * Кэширует чтобы не создавать новый Bot на каждый запрос
 */
export async function getOrCreateBot(botId: number, botToken: string): Promise<Bot> {
  // Проверяем cache
  const cachedBot = botCache.get(botId);
  if (cachedBot) {
    return cachedBot;
  }
  
  // Создаём новый Bot
  const bot = new Bot(botToken);
  
  // Инициализируем (делает API вызов к Telegram)
  await bot.init();
  
  // Кэшируем
  botCache.set(botId, bot);
  
  console.log(`🤖 Created and cached Bot instance for botId=${botId}`);
  
  return bot;
}

/**
 * Очистить cache для конкретного бота (при удалении/обновлении токена)
 */
export function clearBotFromCache(botId: number): void {
  const deleted = botCache.delete(botId);
  if (deleted) {
    console.log(`🗑 Cleared Bot from cache for botId=${botId}`);
  }
}

/**
 * Получить размер cache (для мониторинга)
 */
export function getCacheSize(): number {
  return botCache.size;
}
