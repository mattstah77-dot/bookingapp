import { Bot, Context } from 'grammy';

const BOT_TOKEN = process.env.BOT_TOKEN;

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

export function startBot(bot: Bot) {
  console.log('🤖 Telegram bot starting...');
  
  bot.start();
  console.log('✅ Bot is running!');
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Stopping bot...');
    await bot.stop();
    process.exit(0);
  });
}
