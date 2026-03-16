import { Bot, Context, Keyboard } from 'grammy';
import { db } from '../server/database.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

if (!BOT_TOKEN) {
  console.warn('⚠️ BOT_TOKEN not set, bot will not start');
}

// Проверка админа
function isAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  return userId ? ADMIN_IDS.includes(userId) : false;
}

// Формат даты
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function createBot() {
  if (!BOT_TOKEN) {
    return null;
  }

  const bot = new Bot(BOT_TOKEN);

  // Команда /start
  bot.command('start', async (ctx: Context) => {
    await ctx.reply('Привет! Я бот для бронирования. 👋\n\nИспользуйте /help для списка команд.');
  });

  // Команда /help
  bot.command('help', async (ctx: Context) => {
    let text = 'Доступные команды:\n\n' +
      '/start - Начать\n' +
      '/help - Помощь\n';
    
    if (isAdmin(ctx)) {
      text += '\n🛠 Админ:\n' +
        '/admin - Панель управления\n' +
        '/bookings - Последние записи';
    }
    
    await ctx.reply(text);
  });

  // Команда /admin (только для админов)
  bot.command('admin', async (ctx: Context) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    await ctx.reply(
      '🛠 Админ-панель\n\n' +
      'Откройте веб-интерфейс для управления записями:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📅 Открыть панель', url: `${serverUrl}/admin` }]
          ]
        }
      }
    );
  });

  // Команда /bookings (последние записи)
  bot.command('bookings', async (ctx: Context) => {
    if (!isAdmin(ctx)) {
      await ctx.reply('⛔ У вас нет доступа.');
      return;
    }
    
    try {
      const bookings = await db.getAllBookings({});
      const recent = bookings.slice(-10).reverse(); // Последние 10
      
      if (recent.length === 0) {
        await ctx.reply('📭 Нет записей.');
        return;
      }
      
      let text = '📋 Последние записи:\n\n';
      
      for (const b of recent) {
        const status = b.status === 'confirmed' ? '✅' : '❌';
        text += `${status} ${b.serviceName}\n`;
        text += `   📅 ${formatDate(b.date)} в ${b.time}\n`;
        text += `   💰 ${b.price} ₽\n\n`;
      }
      
      await ctx.reply(text);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      await ctx.reply('❌ Ошибка загрузки записей.');
    }
  });

  // Обработка текстовых сообщений
  bot.on('message:text', async (ctx: Context) => {
    const text = ctx.message?.text;
    if (text) {
      await ctx.reply('Я получил ваше сообщение: ' + text);
    }
  });

  return bot;
}

// Функция для отправки уведомления админу
export async function notifyAdmin(bot: Bot, message: string) {
  for (const adminId of ADMIN_IDS) {
    try {
      await bot.api.sendMessage(adminId, message);
    } catch (err) {
      console.error(`Failed to notify admin ${adminId}:`, err);
    }
  }
}

export async function startBot(bot: Bot) {
  console.log('🤖 Telegram bot starting...');
  
  // Используем webhook на production
  if (WEBHOOK_URL) {
    const webhookUrl = `${WEBHOOK_URL}/webhook`;
    await bot.api.setWebhook(webhookUrl);
    console.log(`✅ Webhook set to: ${webhookUrl}`);
  } else {
    // Polling для локальной разработки
    bot.start();
    console.log('✅ Bot is running (polling mode)');
  }
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Stopping bot...');
    await bot.stop();
    process.exit(0);
  });
}
