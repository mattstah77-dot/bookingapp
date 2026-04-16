// Handler Registry - централизованная регистрация обработчиков ботов
import type { BotHandler, BotHandlerMeta } from './types.js';

// Класс для регистрации и получения handlers по типу бота
class HandlerRegistry {
  private handlers = new Map<string, BotHandler>();
  
  // Регистрация обработчика для типа бота
  register(type: string, handler: BotHandler): void {
    this.handlers.set(type, handler);
    console.log(`📝 Registered handler for bot type: ${type}`);
  }
  
  // Получить обработчик по типу бота
  get(type: string): BotHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      // Fallback на booking по умолчанию
      console.warn(`⚠️ No handler for type "${type}", using booking as fallback`);
      return this.handlers.get('booking')!;
    }
    return handler;
  }
  
  // Получить все зарегистрированные типы
  getTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
  
  // Получить все зарегистрированные handlers
  getAll(): BotHandler[] {
    return Array.from(this.handlers.values());
  }
  
  // Получить список метаданных всех типов ботов
  getMetaList(): BotHandlerMeta[] {
    return this.getAll().map(h => h.meta);
  }
  
  // Получить список публичных доступных типов ботов
  getPublicMetaList(): BotHandlerMeta[] {
    return this.getAll()
      .map(h => h.meta)
      .filter(meta => meta.isActive && meta.isPublic);
  }
}

// Экспортируем singleton instance
export const handlerRegistry = new HandlerRegistry();
