import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Bot } from 'grammy';
import { createBot, startBot } from '../bot/index.js';
import apiRouter from './api.js';
import { db } from './database.js';
import { webhookBotResolver, type AuthenticatedRequest } from './middleware.js';
import { getOrCreateBot } from './botCache.js';
import { checkRateLimit, getClientIp } from './rateLimit.js';
import { getHandlerByType } from './handlers/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API роуты
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Статика фронтенда
const distPath = path.join(__dirname, '..');
app.use(express.static(distPath));

// Глобальный экземпляр главного бота
let globalBot: Bot | null = null;

// ID админов для уведомлений
export const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

// Telegram webhook endpoint для главного бота (обратная совместимость)
app.post('/webhook', async (req, res) => {
  if (globalBot) {
    try {
      await globalBot.handleUpdate(req.body);
    } catch (err) {
      console.error('Webhook error:', err);
    }
  }
  res.send('OK');
});

// Telegram webhook endpoint для дочерних ботов (multi-tenant)
app.post('/webhook/:secret_path', webhookBotResolver, async (req: AuthenticatedRequest, res) => {
  // Rate limiting - проверяем IP клиента
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    // Rate limit exceeded - всё равно возвращаем 200 для Telegram
    res.send('OK');
    return;
  }
  
  const bot = req.bot;
  
  if (!bot) {
    res.send('OK');
    return;
  }
  
  try {
    console.log(`📝 Webhook received for bot ${bot.telegramBotId}, botId=${bot.id}`);
    
    // Проверяем что токен есть
    if (!bot.botToken) {
      console.error(`❌ No token for bot ${bot.telegramBotId}`);
      res.send('OK');
      return;
    }
    
    const botId = bot.id;
    const botType = bot.type || 'booking';
    const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
    
    // Получаем Bot instance из кэша
    const childBot = await getOrCreateBot(botId, bot.botToken);
    
    // Получаем handler по типу бота (БЕЗ запроса в БД!)
    const handler = getHandlerByType(botType);
    
    // Обрабатываем update через handler
    const handled = await handler.handleTelegramUpdate({
      update: req.body,
      bot: childBot,
      botId,
      serverUrl,
    });
    
    // Если handler не обработал - используем fallback (grammY)
    if (!handled) {
      await childBot.handleUpdate(req.body);
    }
    
  } catch (err) {
    console.error(`Webhook error for bot ${bot.telegramBotId}:`, err);
  }
  
  // Всегда возвращаем 200 для Telegram
  res.send('OK');
});

// SPA fallback (для /admin и других роутов)
app.get('*', (req, res) => {
  // Не отдаём index.html для API запросов
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Запуск сервера
async function start() {
  try {
    // Инициализация базы данных
    await db.init();
    console.log('✅ Database initialized');

    // Запуск сервера
    app.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      
      // Запуск Telegram бота
      const bot = createBot();
      if (bot) {
        globalBot = bot; // Сохраняем для webhook
        await startBot(bot);
      } else {
        console.log('ℹ️ Main bot not started (BOT_TOKEN not set)');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();