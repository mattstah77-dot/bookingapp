// Главный роутер обработчиков - выбирает нужный по типу бота
import { db } from '../database.js';
import { bookingHandler } from './bookingHandler.js';
import { leadsHandler } from './leadsHandler.js';
import type { BotHandler, BotContext } from './types.js';

// Маппинг типов ботов на обработчики
const handlers: Record<string, BotHandler> = {
  booking: bookingHandler,
  leads: leadsHandler,
};

// Получить обработчик по типу бота
export function getHandler(botType: string): BotHandler {
  return handlers[botType] || bookingHandler; // По умолчанию booking
}

// Получить обработчик по botId
export async function getHandlerByBotId(botId: number): Promise<BotHandler> {
  const botType = await db.getBotType(botId);
  return getHandler(botType);
}

// Универсальная функция для получения данных клиента
export async function getClientData(botId: number, telegramId?: number): Promise<any> {
  const handler = await getHandlerByBotId(botId);
  return handler.getClientData({ botId, telegramId });
}

// Универсальная функция для обработки действий
export async function handleBotAction(
  botId: number, 
  action: string, 
  data: any, 
  telegramId?: number
): Promise<any> {
  const handler = await getHandlerByBotId(botId);
  return handler.handleAction({ botId, telegramId }, action, data);
}

// Универсальная функция для получения статистики
export async function getBotStats(botId: number): Promise<any> {
  const handler = await getHandlerByBotId(botId);
  return handler.getStats({ botId });
}

// Универсальная функция для получения данных админки
export async function getAdminData(botId: number, ownerId?: number): Promise<any> {
  const handler = await getHandlerByBotId(botId);
  return handler.getAdminData({ botId, ownerId });
}
