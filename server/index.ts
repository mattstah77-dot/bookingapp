import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Bot } from 'grammy';
import { createBot, startBot } from '../bot/index.js';
import apiRouter from './api.js';
import { db } from './database.js';
import { webhookBotResolver, type AuthenticatedRequest } from './middleware.js';

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
  const bot = req.bot;
  
  if (!bot) {
    res.send('OK');
    return;
  }
  
  try {
    console.log(`📝 Webhook received for bot ${bot.telegramBotId}, token: ${bot.botToken ? 'present' : 'MISSING'}`);
    
    // Проверяем что токен есть
    if (!bot.botToken) {
      console.error(`❌ No token for bot ${bot.telegramBotId}`);
      res.send('OK');
      return;
    }
    
    // Динамически создаём бота с токеном для обработки обновления
    const childBot = new Bot(bot.botToken);
    
    // Инициализируем бота
    await childBot.init();
    
    // Добавляем обработчики команд для дочернего бота
    const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
    const botId = bot.id;
    
    childBot.command('start', async (ctx) => {
      await ctx.reply(
        'Привет! Я бот для бронирования. 👋\n\nВыберите действие:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}?bot_id=${botId}` } }],
              [{ text: '📋 Мои записи', callback_data: 'my_bookings_menu' }]
            ]
          }
        }
      );
    });
    
    childBot.on('callback_query', async (ctx) => {
      const callbackData = ctx.callbackQuery?.data;
      if (!callbackData) return;
      
      await ctx.answerCallbackQuery();
      
      if (callbackData === 'my_bookings_menu') {
        const telegramId = ctx.from?.id;
        if (!telegramId) return;
        
        // Получаем записи пользователя
        const upcoming = await db.getUserUpcomingBookings(botId, telegramId);
        const past = await db.getUserPastBookings(botId, telegramId);
        
        if (upcoming.length === 0 && past.length === 0) {
          await ctx.editMessageText(
            'У вас пока нет записей.\n\n✂️ Нажмите "Записаться", чтобы создать новую запись.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}?bot_id=${botId}` } }]
                ]
              }
            }
          );
          return;
        }
        
        let text = '📋 Ваши записи\n\n';
        if (upcoming.length > 0) text += `📅 Предстоящих: ${upcoming.length}\n`;
        if (past.length > 0) text += `📆 Прошедших: ${past.length}`;
        
        await ctx.editMessageText(text, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Предстоящие', callback_data: `my_bookings_upcoming_${botId}` }],
              [{ text: '📆 Прошедшие', callback_data: `my_bookings_past_${botId}` }],
              [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}?bot_id=${botId}` } }]
            ]
          }
        });
      }
    });
    
    // Обрабатываем обновление
    await childBot.handleUpdate(req.body);
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