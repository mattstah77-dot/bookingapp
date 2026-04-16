// Универсальные типы для обработчиков ботов

import type { Bot } from 'grammy';

export type BotType = 'booking' | 'leads';

// Метаданные типа бота (продуктовый слой)
export interface BotHandlerMeta {
  type: string;
  name: string;
  description: string;
  category: string;
  features: string[];
  isActive: boolean;    // Включен/выключен
  isPublic: boolean;    // Доступен публично
  price?: number;       // Цена в USD/месяц (для будущих тарифов)
}

export interface BotContext {
  botId: number;
  ownerId?: number;
  telegramId?: number;
}

// Контекст для обработки Telegram update
export interface TelegramUpdateContext {
  update: any;      // Telegram Update object
  bot: Bot;         // Bot instance для отправки сообщений
  botId: number;    // ID бота в системе
  serverUrl: string; // URL Mini App
}

// Универсальный интерфейс обработчика
export interface BotHandler {
  // Метаданные типа бота (продуктовый слой)
  meta: BotHandlerMeta;
  
  // Получить данные для клиента (mini-app)
  getClientData(ctx: BotContext): Promise<any>;
  
  // Обработать действие клиента
  handleAction(ctx: BotContext, action: string, data: any): Promise<any>;
  
  // Получить статистику для админа
  getStats(ctx: BotContext): Promise<any>;
  
  // Получить данные для админки
  getAdminData(ctx: BotContext): Promise<any>;
  
  // Обработать Telegram update (webhook)
  // Возвращает true если обработано, false если нужен fallback
  handleTelegramUpdate(ctx: TelegramUpdateContext): Promise<boolean>;
}

// Стандартный формат ответа API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Стандартный формат для списка данных
export interface ListResponse<T = any> {
  items: T[];
  total: number;
}
