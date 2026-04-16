import { Request, Response, NextFunction } from 'express';
import { db } from './database.js';

// Тип расширенного запроса с данными бота (из БД)
export interface BotInfo {
 id: number;
 ownerId: number;
 telegramBotId: string;
 secretPath: string;
 isActive: boolean;
 botToken?: string; // Токен для webhook обработки
 type?: string;     // Тип бота: 'booking' | 'leads'
 // Поля из БД (snake_case) - для совместимости
 owner_id?: number;
 telegram_bot_id?: string;
 secret_path?: string;
 is_active?: boolean;
 bot_token?: string;
 // Для обратной совместимости - можно использовать любое
 [key: string]: any;
}

// Тип для headers - поддерживает string | string[]
type HeadersType = Record<string, string | string[] | undefined>;

// Тип расширенного запроса с данными бота
export interface AuthenticatedRequest extends Request {
 botId?: number;
 ownerId?: number;
 bot?: BotInfo;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Вспомогательная функция для безопасного получения заголовка
export function getHeaderAsString(headers: any, key: string): string {
 const value = headers[key];
 if (!value) return '';
 return Array.isArray(value) ? value[0] : value;
}

// Получить botId из запроса (из middleware или по умолчанию1 для обратной совместимости)
export function getBotId(req: AuthenticatedRequest): number {
 return req.botId ||1;
}

/**
 * Middleware для извлечения bot_id из JWT токена и проверки бота
 * Все запросы от Mini App должны использовать этот middleware
 */
export async function botFilter(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
 try {
 // Получаем bot_id из заголовка (устанавливается после верификации JWT)
 const botIdStr = getHeaderAsString(req.headers, 'x-bot-id');
    
    if (!botIdStr) {
      res.status(401).json({ error: 'Bot ID is required' });
      return;
    }
    
    const parsedBotId = parseInt(botIdStr, 10);
    if (isNaN(parsedBotId)) {
      res.status(401).json({ error: 'Invalid Bot ID' });
      return;
    }
    
    // Проверяем, что бот существует и активен
    const bot = await db.getBotById(parsedBotId);
    if (!bot) {
      res.status(404).json({ error: 'Bot not found' });
      return;
    }
    
    if (!bot.is_active) {
      res.status(403).json({ error: 'Bot is inactive' });
      return;
    }
    
// Добавляем данные бота в запрос (с проверкой на undefined)
 req.botId = parsedBotId;
 req.bot = {
 id: bot.id,
 ownerId: bot.owner_id ??0,
 telegramBotId: bot.telegram_bot_id ??'',
 secretPath: bot.secret_path ??'',
 isActive: bot.is_active ??false,
 };
   
 next();
 } catch (error) {
 console.error('❌ botFilter middleware error:', error);
 res.status(500).json({ error: 'Internal server error' });
 }
}

/**
 * Middleware для проверки, что пользователь является владельцем бота
 * Используется для админских операций
 */
export async function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
 try {
 const telegramIdStr = getHeaderAsString(req.headers, 'x-telegram-id');
    
    if (!telegramIdStr) {
      res.status(401).json({ error: 'Telegram ID is required' });
      return;
    }
    
    const parsedTelegramId = parseInt(telegramIdStr, 10);
    if (isNaN(parsedTelegramId)) {
      res.status(401).json({ error: 'Invalid Telegram ID' });
      return;
    }
    
    // Проверяем, что бот уже определён middleware botFilter
    if (!req.bot) {
      res.status(401).json({ error: 'Bot not identified' });
      return;
    }
    
    // Проверяем, что пользователь является владельцем бота
    if (req.bot.ownerId !== parsedTelegramId) {
      res.status(403).json({ error: 'Access denied. Only bot owner can perform this action.' });
      return;
    }
    
    req.ownerId = parsedTelegramId;
    next();
  } catch (error) {
    console.error('❌ requireOwner middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware для webhook - определяет бота по secret_path из URL
 */
export async function webhookBotResolver(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const secretPathRaw = req.params.secret_path;
    const secretPath = Array.isArray(secretPathRaw) ? secretPathRaw[0] : secretPathRaw;
    
    if (!secretPath) {
      res.status(400).json({ error: 'Secret path is required' });
      return;
    }
    
    // Ищем бота по secret_path
    const bot = await db.getBotBySecretPath(secretPath);
    if (!bot) {
      console.log(`⚠️ Bot not found for secret_path: ${secretPath}`);
      res.status(200).send('OK'); // Всегда возвращаем 200 для Telegram
      return;
    }
    
    if (!bot.is_active) {
      console.log(`⚠️ Bot is inactive: ${bot.telegram_bot_id}`);
      res.status(200).send('OK');
      return;
    }
    
    // Добавляем данные бота в запрос (с проверкой на undefined)
    req.botId = bot.id;
    req.bot = {
      id: bot.id,
      ownerId: bot.owner_id ?? 0,
      telegramBotId: bot.telegram_bot_id ?? '',
      secretPath: bot.secret_path ?? '',
      isActive: bot.is_active ?? false,
      botToken: bot.bot_token ?? '',
      type: bot.type ?? 'booking', // Тип бота - для выбора handler без доп. запроса
    };
    
    next();
  } catch (error) {
    console.error('❌ webhookBotResolver middleware error:', error);
    res.status(200).send('OK'); // Всегда возвращаем 200 для Telegram
  }
}
