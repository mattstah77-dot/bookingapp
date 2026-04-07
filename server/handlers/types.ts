// Универсальные типы для обработчиков ботов

export type BotType = 'booking' | 'leads';

export interface BotContext {
  botId: number;
  ownerId?: number;
  telegramId?: number;
}

// Универсальный интерфейс обработчика
export interface BotHandler {
  // Получить данные для клиента (mini-app)
  getClientData(ctx: BotContext): Promise<any>;
  
  // Обработать действие клиента
  handleAction(ctx: BotContext, action: string, data: any): Promise<any>;
  
  // Получить статистику для админа
  getStats(ctx: BotContext): Promise<any>;
  
  // Получить данные для админки
  getAdminData(ctx: BotContext): Promise<any>;
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
