import { Bot, Context, Keyboard } from 'grammy';
import { db } from '../server/database.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

console.log('🤖 Bot initializing...');
console.log('📝 BOT_TOKEN set:', !!BOT_TOKEN);
console.log('📝 ADMIN_IDS:', ADMIN_IDS);

if (!BOT_TOKEN) {
  console.warn('⚠️ BOT_TOKEN not set, bot will not start');
}

// Проверка админа
function isAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  const result = userId ? ADMIN_IDS.includes(userId) : false;
  console.log(`👤 User ${userId}, isAdmin: ${result}`);
  return result;
}

// Константы для пагинации
const PAGE_SIZE = 5;

// Формат даты с днём недели
function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  return `${date.getDate()} ${date.toLocaleDateString('ru-RU', { month: 'short' })} (${days[date.getDay()]})`;
}

// Формирование клавиатуры со списком записей
function getBookingsKeyboard(page: number, total: number, messageId?: number) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const keyboard = [];
  
  // Кнопки пагинации
  const navRow = [];
  if (page > 0) {
    navRow.push({ text: '◀ Назад', callback_data: `bookings_page_${page - 1}` });
  }
  if (page < totalPages - 1) {
    navRow.push({ text: 'Далее ▶', callback_data: `bookings_page_${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }

  // Кнопка возврата в меню
  keyboard.push([{ text: '🔙 В меню', callback_data: 'admin_menu' }]);
  
  return {
    reply_markup: { inline_keyboard: keyboard }
  };
}

// Формирование карточки записи
function getBookingCard(booking: any, messageId?: number) {
  const statusText = booking.status === 'confirmed' ? '✅ Подтверждено' : '❌ Отменено';
  const statusColor = booking.status === 'confirmed' ? '#22c55e' : '#ef4444';
  
  // Вычисляем время окончания
  const [hours, mins] = booking.time.split(':').map(Number);
  const endMins = hours * 60 + mins + booking.duration;
  const endHours = Math.floor(endMins / 60);
  const endMinsRem = endMins % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinsRem).padStart(2, '0')}`;
  
  let text = `📋 Запись #${booking.id.slice(0, 8)}\n\n`;
  text += `✂️ Услуга: ${booking.serviceName}\n`;
  text += `📅 Дата: ${formatDateFull(booking.date)}\n`;
  text += `🕐 Время: ${booking.time} - ${endTime}\n`;
  text += `💰 Цена: ${booking.price} ₽\n`;
  text += `📊 Статус: ${statusText}\n\n`;
  
  if (booking.clientName || booking.clientPhone) {
    text += `👤 Клиент: ${booking.clientName || '—'}\n`;
    text += `📱 Телефон: ${booking.clientPhone || '—'}`;
  }
  
  const keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '❌ Отменить', callback_data: `booking_cancel_${booking.id}` },
          { text: '🗑 Удалить', callback_data: `booking_delete_${booking.id}` }
        ],
        [{ text: '🔙 Назад', callback_data: 'bookings_page_0' }]
      ]
    }
  };
  
  return { text, keyboard };
}

// Формирование списка записей для страницы
async function getBookingsListPage(page: number) {
  const allBookings = await db.getAllBookings({});
  
  // Сортировка: ближайшие первые (по дате → по времени)
  allBookings.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  
  const total = allBookings.length;
  const start = page * PAGE_SIZE;
  const pageBookings = allBookings.slice(start, start + PAGE_SIZE);
  
  let text = `📋 Записи (стр. ${page + 1} из ${Math.ceil(total / PAGE_SIZE)})\n\n`;
  
  if (pageBookings.length === 0) {
    text += 'Записей пока нет';
  }
  
  // Формируем клавиатуру с кнопками записей
  const keyboard = [];
  
  for (const b of pageBookings) {
    const status = b.status === 'confirmed' ? '✅' : '❌';
    const dayStr = formatDateFull(b.date);
    const btnText = `${status} ${dayStr} ${b.time} | ${b.serviceName} — ${b.price}₽`;
    keyboard.push([{ text: btnText, callback_data: `booking_view_${b.id}` }]);
  }
  
  // Кнопки пагинации
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const navRow = [];
  if (page > 0) {
    navRow.push({ text: '◀ Назад', callback_data: `bookings_page_${page - 1}` });
  }
  if (page < totalPages - 1) {
    navRow.push({ text: 'Далее ▶', callback_data: `bookings_page_${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }
  
  // Кнопка возврата в меню
  keyboard.push([{ text: '🔙 В меню', callback_data: 'admin_menu' }]);
  
  return { text, keyboard, total };
}

export function createBot() {
  if (!BOT_TOKEN) {
    console.warn('⚠️ BOT_TOKEN not set, returning null');
    return null;
  }

  const bot = new Bot(BOT_TOKEN);

  // Добавим обработку ошибок
  bot.catch((err) => {
    console.error('❌ Bot error:', err);
  });

  // Команда /start
  bot.command('start', async (ctx: Context) => {
    const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
    
    const keyboard = new Keyboard()
      .text('📋 Мои записи').row()
      .text('✂️ Записаться');
    
    await ctx.reply(
      'Привет! Я бот для бронирования. 👋\n\nВыберите действие:',
      { reply_markup: keyboard }
    );
  });

  // Обработка "Мои записи"
  bot.hears('📋 Мои записи', async (ctx: Context) => {
    const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
    
    await ctx.reply(
      'Ваши записи:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '📋 Открыть мои записи', web_app: { url: `${serverUrl}/my-bookings` } }]
          ]
        }
      }
    );
  });

  // Обработка "Записаться"
  bot.hears('✂️ Записаться', async (ctx: Context) => {
    const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
    
    await ctx.reply(
      'Перейдите к записи:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}` } }]
          ]
        }
      }
    );
  });

  // Команда /help
  bot.command('help', async (ctx: Context) => {
    let text = 'Доступные команды:\n\n' +
      '/start - Начать\n' +
      '/help - Помощь\n';
    
    if (isAdmin(ctx)) {
      text += '\n🛠 Админ:\n' +
        '/admin - Панель управления';
    }
    
    await ctx.reply(text);
  });

  // Команда /admin
  bot.command('admin', async (ctx: Context) => {
    try {
      if (!isAdmin(ctx)) {
        await ctx.reply('⛔ У вас нет доступа к админ-панели.');
        return;
      }
      
      const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
      
      await ctx.reply(
        '🛠 Админ-панель',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Открыть панель', web_app: { url: `${serverUrl}/admin` } }],
              [{ text: '📋 Посмотреть записи', callback_data: 'bookings_list' }]
            ]
          }
        }
      );
    } catch (err) {
      console.error('Error in /admin:', err);
      await ctx.reply('❌ Произошла ошибка');
    }
  });

  // Обработка callback-запросов
  bot.on('callback_query', async (ctx: Context) => {
    const callbackData = ctx.callbackQuery?.data;
    const msg = ctx.callbackQuery?.message;
    
    if (!callbackData || !msg) return;
    
    // Отвечаем на callback чтобы убрать "часики"
    await ctx.answerCallbackQuery();
    
    // Меню админа
    if (callbackData === 'admin_menu') {
      const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
      await ctx.editMessageText(
        '🛠 Админ-панель',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📅 Открыть панель', web_app: { url: `${serverUrl}/admin` } }],
              [{ text: '📋 Посмотреть записи', callback_data: 'bookings_list' }]
            ]
          }
        }
      );
      return;
    }
    
    // Первый показ списка записей
    if (callbackData === 'bookings_list') {
      const { text, keyboard } = await getBookingsListPage(0);
      await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard } });
      return;
    }
    
    // Пагинация записей
    if (callbackData.startsWith('bookings_page_')) {
      const page = parseInt(callbackData.replace('bookings_page_', ''));
      const { text, keyboard } = await getBookingsListPage(page);
      
      await ctx.editMessageText(text, { reply_markup: { inline_keyboard: keyboard } });
      return;
    }
    
    // Просмотр конкретной записи
    if (callbackData.startsWith('booking_view_')) {
      const bookingId = callbackData.replace('booking_view_', '');
      const allBookings = await db.getAllBookings({});
      const booking = allBookings.find(b => b.id === bookingId);
      
      if (!booking) {
        await ctx.editMessageText('Запись не найдена', {
          reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: 'bookings_page_0' }]] }
        });
        return;
      }
      
      const { text, keyboard } = getBookingCard(booking);
      await ctx.editMessageText(text, keyboard);
      return;
    }
    
    // Отмена записи
    if (callbackData.startsWith('booking_cancel_')) {
      const bookingId = callbackData.replace('booking_cancel_', '');
      await db.updateBookingStatus(bookingId, 'cancelled');
      
      const booking = (await db.getAllBookings({})).find(b => b.id === bookingId);
      if (booking) {
        const { text, keyboard } = getBookingCard(booking);
        await ctx.editMessageText(text + '\n❌ Запись отменена', keyboard);
      }
      return;
    }
    
    // Удаление записи
    if (callbackData.startsWith('booking_delete_')) {
      const bookingId = callbackData.replace('booking_delete_', '');
      await db.deleteBooking(bookingId);
      
      // Возвращаемся к списку
      const { text, keyboard } = await getBookingsListPage(0);
      await ctx.editMessageText(text + '\n🗑 Запись удалена', { reply_markup: { inline_keyboard: keyboard } });
      return;
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
  console.log('📝 WEBHOOK_URL:', WEBHOOK_URL);
  
  // Инициализация бота (обязательно!)
  try {
    await bot.init();
    console.log('✅ Bot initialized');
  } catch (err) {
    console.error('❌ Failed to init bot:', err);
    return;
  }
  
  // Используем webhook на production
  if (WEBHOOK_URL) {
    try {
      const webhookUrl = `${WEBHOOK_URL}/webhook`;
      await bot.api.setWebhook(webhookUrl);
      console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (err) {
      console.error('❌ Failed to set webhook:', err);
    }
  } else {
    // Polling для локальной разработки
    console.log('⚠️ No WEBHOOK_URL, using polling');
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
