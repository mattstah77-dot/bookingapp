import { Bot, Context } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!BOT_TOKEN) {
  console.warn('⚠️ BOT_TOKEN not set, bot will not start');
}

export function createBot() {
  if (!BOT_TOKEN) {
    return null;
  }

  const bot = new Bot(BOT_TOKEN);

  // Команда /start
  bot.command('start', async (ctx: Context) => {
    await ctx.reply('Привет! Я бот для бронирования. 👋');
  });

  // Команда /help
  bot.command('help', async (ctx: Context) => {
    await ctx.reply(
      'Доступные команды:\n' +
      '/start - Начать\n' +
      '/help - Помощь'
    );
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
