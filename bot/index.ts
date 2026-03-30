import { Bot, Context, Keyboard } from 'grammy';
import { db } from '../server/database.js';
import crypto from 'crypto';

// Хранилище состояний ожидания токена (в памяти)
// В продакшене лучше использовать Redis или БД
const pendingTokenStates = new Map<number, boolean>();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const SERVER_URL = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

console.log('🤖 Bot initializing...');
console.log('📝 BOT_TOKEN set:', !!BOT_TOKEN);
console.log('📝 ADMIN_IDS:', ADMIN_IDS);
console.log('📝 SERVER_URL:', SERVER_URL);

if (!BOT_TOKEN) {
  console.warn('⚠️ BOT_TOKEN not set, bot will not start');
}

// ========== ФУНКЦИИ ДЛЯ СОЗДАНИЯ ДОЧЕРНИХ БОТОВ ==========

/**
 * Валидирует токен бота через Telegram API (getMe)
 */
export async function validateToken(botToken: string): Promise<{ success: boolean; bot?: { id: string; username: string; first_name: string }; error?: string }> {
  try {
    const testBot = new Bot(botToken);
    const me = await testBot.api.getMe();
    return {
      success: true,
      bot: {
        id: me.id.toString(),
        username: me.username || '',
        first_name: me.first_name,
      },
    };
  } catch (error: any) {
    console.error('❌ Token validation failed:', error.message);
    return {
      success: false,
      error: error.description || 'Invalid token',
    };
  }
}

/**
 * Генерирует уникальный secret_path для webhook
 */
export function generateSecretPath(): string {
  return 'wh_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Устанавливает webhook для дочернего бота
 */
export async function setupWebhook(botToken: string, secretPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = `${SERVER_URL}/webhook/${secretPath}`;
    const testBot = new Bot(botToken);
    
    // Инициализируем бота перед установкой webhook
    await testBot.init();
    
    await testBot.api.setWebhook(webhookUrl);
    console.log(`✅ Webhook set for ${webhookUrl}`);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Webhook setup failed:', error.message);
    return {
      success: false,
      error: error.description || 'Failed to set webhook',
    };
  }
}

/**
 * Создаёт дочернего бота в системе
 */
export async function createChildBot(
  botToken: string,
  ownerId: number,
  ownerName: string
): Promise<{ success: boolean; bot?: any; error?: string }> {
  try {
    // 1. Валидируем токен
    const validation = await validateToken(botToken);
    if (!validation.success || !validation.bot) {
      return { success: false, error: validation.error || 'Invalid token' };
    }
    
    // 2. Генерируем secret_path
    const secretPath = generateSecretPath();
    
    // 3. Пробуем установить webhook
    const webhookResult = await setupWebhook(botToken, secretPath);
    if (!webhookResult.success) {
      return { success: false, error: webhookResult.error || 'Failed to setup webhook' };
    }
    
    // 4. Очищаем старые данные если бот уже был
    await db.clearBotData(validation.bot.id);
    
    // 5. Создаём запись в БД
    const bot = await db.createBot({
      telegramBotId: validation.bot.id,
      secretPath: secretPath,
      botToken: botToken, // В продакшене нужно шифровать
      botUsername: validation.bot.username,
      ownerId: ownerId,
      ownerName: ownerName,
      isActive: true,
      status: 'success',
    });
    
    // 6. Seed данные для нового бота
    await db.seedBotData(bot.id);
    
    console.log(`✅ Child bot created: ${validation.bot.username} (ID: ${bot.id})`);
    
    return { success: true, bot };
  } catch (error: any) {
    console.error('❌ Failed to create child bot:', error);
    return {
      success: false,
      error: error.message || 'Failed to create bot',
    };
  }
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

// ID главного бота (по умолчанию = 1)
const MAIN_BOT_ID = 1;

// Формат даты с днём недели
function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  return `${date.getDate()} ${date.toLocaleDateString('ru-RU', { month: 'short' })} (${days[date.getDay()]})`;
}

// Получить записи пользователя по telegramId (для главного бота)
async function getUserBookings(telegramId: number, type: 'upcoming' | 'past') {
  const allBookings = await db.getBookings(MAIN_BOT_ID);
  const today = new Date().toISOString().split('T')[0];
  
  let userBookings = allBookings.filter(b => b.telegramId === telegramId);
  
  if (type === 'upcoming') {
    // Предстоящие: дата >= сегодня и статус confirmed
    userBookings = userBookings
      .filter(b => b.date >= today && b.status === 'confirmed')
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
  } else {
    // Прошедшие: дата < сегодня или любой не-confirmed статус
    userBookings = userBookings
      .filter(b => b.date < today || b.status !== 'confirmed')
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
  }
  
  return userBookings;
}

// Формирование текста записи для клиента
function getUserBookingText(booking: any): string {
  let statusText = '✅ Подтверждено';
  if (booking.status === 'cancelled_by_user') {
    statusText = '❌ Отменено вами';
  } else if (booking.status === 'cancelled_by_admin') {
    statusText = '❌ Отменено администратором';
  } else if (booking.status === 'cancelled') {
    statusText = '❌ Отменено';
  } else if (booking.status === 'completed') {
    statusText = '✅ Завершено';
  } else if (booking.status === 'no_show') {
    statusText = '⚠️ Не явился';
  }
  
  // Вычисляем время окончания
  const [hours, mins] = booking.time.split(':').map(Number);
  const endMins = hours * 60 + mins + booking.duration;
  const endHours = Math.floor(endMins / 60);
  const endMinsRem = endMins % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinsRem).padStart(2, '0')}`;
  
  let text = `📋 ${booking.serviceName}\n`;
  text += `📅 ${formatDateFull(booking.date)}\n`;
  text += `🕐 ${booking.time} - ${endTime}\n`;
  text += `💰 ${booking.price} ₽\n`;
  text += `📊 ${statusText}`;
  
  return text;
}

// Клавиатура выбора типа записей
function getMyBookingsMenuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📅 Предстоящие', callback_data: 'my_bookings_upcoming' }],
        [{ text: '📆 Прошедшие', callback_data: 'my_bookings_past' }]
      ]
    }
  };
}

// Клавиатура с записями клиента
function getUserBookingsKeyboard(bookings: any[], type: 'upcoming' | 'past', page: number = 0) {
  const PAGE_SIZE = 5;
  const start = page * PAGE_SIZE;
  const pageBookings = bookings.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(bookings.length / PAGE_SIZE);
  
  const keyboard = [];
  
  // Кнопки записей
  for (const b of pageBookings) {
    let status = '✅';
    if (b.status === 'cancelled_by_user') status = '❌👤';
    else if (b.status === 'cancelled_by_admin') status = '❌👨‍💼';
    else if (b.status === 'cancelled') status = '❌';
    else if (b.status === 'completed') status = '✅';
    else if (b.status === 'no_show') status = '⚠️';
    
    const dayStr = formatDateFull(b.date);
    const btnText = `${status} ${dayStr} ${b.time} | ${b.serviceName}`;
    keyboard.push([{ text: btnText, callback_data: `my_booking_view_${type}_${b.id}_${page}` }]);
  }
  
  // Пагинация
  const navRow = [];
  if (page > 0) {
    navRow.push({ text: '◀ Назад', callback_data: `my_bookings_${type}_${page - 1}` });
  }
  if (page < totalPages - 1) {
    navRow.push({ text: 'Далее ▶', callback_data: `my_bookings_${type}_${page + 1}` });
  }
  if (navRow.length > 0) {
    keyboard.push(navRow);
  }
  
  // Кнопки навигации
  keyboard.push([
    { text: '📅 Предстоящие', callback_data: 'my_bookings_upcoming_0' },
    { text: '📆 Прошедшие', callback_data: 'my_bookings_past_0' }
  ]);
  keyboard.push([{ text: '🔙 В меню', callback_data: 'main_menu' }]);
  
  return { reply_markup: { inline_keyboard: keyboard } };
}

// Детальная карточка записи клиента
function getUserBookingDetail(booking: any, type: 'upcoming' | 'past', page: number) {
  let statusText = '✅ Подтверждено';
  if (booking.status === 'cancelled_by_user') {
    statusText = '❌ Отменено вами';
  } else if (booking.status === 'cancelled_by_admin') {
    statusText = '❌ Отменено администратором';
  } else if (booking.status === 'cancelled') {
    statusText = '❌ Отменено';
  } else if (booking.status === 'completed') {
    statusText = '✅ Завершено';
  } else if (booking.status === 'no_show') {
    statusText = '⚠️ Не явился';
  }

  // Вычисляем время окончания
  const [hours, mins] = booking.time.split(':').map(Number);
  const endMins = hours * 60 + mins + booking.duration;
  const endHours = Math.floor(endMins / 60);
  const endMinsRem = endMins % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinsRem).padStart(2, '0')}`;
  
  let text = `📋 Запись #${booking.id}\n\n`;
  text += `✂️ Услуга: ${booking.serviceName}\n`;
  text += `📅 Дата: ${formatDateFull(booking.date)}\n`;
  text += `🕐 Время: ${booking.time} - ${endTime}\n`;
  text += `💰 Цена: ${booking.price} ₽\n`;
  text += `📊 Статус: ${statusText}`;
  
  // Кнопка отмены только для предстоящих подтверждённых
  const keyboard = [];
  if (type === 'upcoming' && booking.status === 'confirmed') {
    keyboard.push([{ text: '❌ Отменить запись', callback_data: `my_booking_cancel_${booking.id}` }]);
  }
  keyboard.push([{ text: '🔙 Назад', callback_data: `my_bookings_${type}_${page}` }]);
  
  return { text, keyboard: { reply_markup: { inline_keyboard: keyboard } } };
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
  let statusText = '✅ Подтверждено';
  if (booking.status === 'cancelled_by_user') {
    statusText = '❌ Отменено клиентом';
  } else if (booking.status === 'cancelled_by_admin') {
    statusText = '❌ Отменено администратором';
  } else if (booking.status === 'cancelled') {
    statusText = '❌ Отменено';
  } else if (booking.status === 'completed') {
    statusText = '✅ Завершено';
  } else if (booking.status === 'no_show') {
    statusText = '⚠️ Не явился';
  }
  
  const statusColor = booking.status === 'confirmed' ? '#22c55e' : '#ef4444';
  
  // Вычисляем время окончания
  const [hours, mins] = booking.time.split(':').map(Number);
  const endMins = hours * 60 + mins + booking.duration;
  const endHours = Math.floor(endMins / 60);
  const endMinsRem = endMins % 60;
  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinsRem).padStart(2, '0')}`;
  
  let text = `📋 Запись #${booking.id}\n\n`;
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
  const allBookings = await db.getAllBookings(MAIN_BOT_ID);
  
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
    let status = '✅';
    if (b.status === 'cancelled_by_user') status = '❌👤';
    else if (b.status === 'cancelled_by_admin') status = '❌👨‍💼';
    else if (b.status === 'cancelled') status = '❌';
    else if (b.status === 'completed') status = '✅';
    else if (b.status === 'no_show') status = '⚠️';
    
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

  // Команда /start - главное меню на inline кнопках
  bot.command('start', async (ctx: Context) => {
    const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
    
    await ctx.reply(
      'Привет! Я бот для бронирования. 👋\n\nВыберите действие:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}` } }],
            [{ text: '📋 Мои записи', callback_data: 'my_bookings_menu' }]
          ]
        }
      }
    );
  });

  // Обработка "Мои записи" - показываем записи клиента
  bot.hears('📋 Мои записи', async (ctx: Context) => {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      await ctx.reply('Не могу определить пользователя');
      return;
    }
    
    const upcoming = await getUserBookings(telegramId, 'upcoming');
    const past = await getUserBookings(telegramId, 'past');
    
    if (upcoming.length === 0 && past.length === 0) {
      await ctx.reply(
        'У вас пока нет записей.\n\n✂️ Нажмите "Записаться", чтобы создать новую запись.',
        getMyBookingsMenuKeyboard()
      );
      return;
    }
    
    let text = '📋 Ваши записи\n\n';
    if (upcoming.length > 0) {
      text += `📅 Предстоящих: ${upcoming.length}\n`;
    }
    if (past.length > 0) {
      text += `📆 Прошедших: ${past.length}`;
    }
    
    await ctx.reply(text, getMyBookingsMenuKeyboard());
  });

  // Обработка "Записаться" - открывает web_app
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
              [{ text: '📋 Посмотреть записи', callback_data: 'bookings_list' }],
              [{ text: '🤖 Добавить бота', callback_data: 'addbot_start' }]
            ]
          }
        }
      );
    } catch (err) {
      console.error('Error in /admin:', err);
      await ctx.reply('❌ Произошла ошибка');
    }
  });

  // Команда /addbot - добавить нового бота для бизнеса
  bot.command('addbot', async (ctx: Context) => {
    try {
      // Проверяем что пользователь админ
      if (!isAdmin(ctx)) {
        await ctx.reply('⛔ У вас нет доступа к этой команде.');
        return;
      }
      
      const telegramId = ctx.from?.id;
      
      await ctx.reply(
        '🤖 Создание нового бота для бизнеса\n\n' +
        'Пожалуйста, отправьте токен бота, полученный от @BotFather\n\n' +
        'Формат: просто отправьте токен в формате XXXXX:XXXXXXXXXXXXX',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_menu' }]
            ]
          }
        }
      );
      
      // Устанавливаем состояние ожидания токена
      if (telegramId) {
        pendingTokenStates.set(telegramId, true);
      }
    } catch (err) {
      console.error('Error in /addbot:', err);
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
    
    const telegramId = ctx.from?.id;
    if (!telegramId) return;
    
    // ========== ГЛАВНОЕ МЕНЮ ==========
    if (callbackData === 'main_menu') {
      const serverUrl = process.env.SERVER_URL || 'https://bookingapp-obxp.onrender.com';
      await ctx.editMessageText(
        'Привет! Я бот для бронирования. 👋\n\nВыберите действие:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}` } }],
              [{ text: '📋 Мои записи', callback_data: 'my_bookings_menu' }]
            ]
          }
        }
      );
      return;
    }
    
    // ========== МОИ ЗАПИСИ - МЕНЮ ==========
    if (callbackData === 'my_bookings_menu') {
      const upcoming = await getUserBookings(telegramId, 'upcoming');
      const past = await getUserBookings(telegramId, 'past');
      
      if (upcoming.length === 0 && past.length === 0) {
        await ctx.editMessageText(
          'У вас пока нет записей.\n\n✂️ Нажмите "Записаться", чтобы создать новую запись.',
          getMyBookingsMenuKeyboard()
        );
        return;
      }
      
      let text = '📋 Ваши записи\n\n';
      if (upcoming.length > 0) {
        text += `📅 Предстоящих: ${upcoming.length}\n`;
      }
      if (past.length > 0) {
        text += `📆 Прошедших: ${past.length}`;
      }
      
      await ctx.editMessageText(text, getMyBookingsMenuKeyboard());
      return;
    }
    
    // ========== ПРЕДСТОЯЩИЕ ЗАПИСИ ==========
    if (callbackData.startsWith('my_bookings_upcoming')) {
      const parts = callbackData.split('_');
      const page = parseInt(parts[parts.length - 1]) || 0;
      const bookings = await getUserBookings(telegramId, 'upcoming');
      
      if (bookings.length === 0) {
        await ctx.editMessageText(
          '📅 У вас нет предстоящих записей.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📆 Прошедшие', callback_data: 'my_bookings_past_0' }],
                [{ text: '🔙 В меню', callback_data: 'main_menu' }]
              ]
            }
          }
        );
        return;
      }
      
      let text = `📅 Предстоящие записи (${bookings.length})\n\n`;
      text += 'Выберите запись для подробной информации:';
      
      await ctx.editMessageText(text, getUserBookingsKeyboard(bookings, 'upcoming', page));
      return;
    }
    
    // ========== ПРОШЕДШИЕ ЗАПИСИ ==========
    if (callbackData.startsWith('my_bookings_past')) {
      const parts = callbackData.split('_');
      const page = parseInt(parts[parts.length - 1]) || 0;
      const bookings = await getUserBookings(telegramId, 'past');
      
      if (bookings.length === 0) {
        await ctx.editMessageText(
          '📆 У вас нет прошедших записей.',
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: '📅 Предстоящие', callback_data: 'my_bookings_upcoming_0' }],
                [{ text: '🔙 В меню', callback_data: 'main_menu' }]
              ]
            }
          }
        );
        return;
      }
      
      let text = `📆 Прошедшие записи (${bookings.length})\n\n`;
      text += 'Выберите запись для подробной информации:';
      
      await ctx.editMessageText(text, getUserBookingsKeyboard(bookings, 'past', page));
      return;
    }
    
    // ========== ПРОСМОТР ЗАПИСИ КЛИЕНТА ==========
    if (callbackData.startsWith('my_booking_view_')) {
      // Формат: my_booking_view_upcoming_123_0 или my_booking_view_past_123_0
      const parts = callbackData.split('_');
      const type = parts[3] as 'upcoming' | 'past';
      const bookingId = parseInt(parts[4]);
      const page = parseInt(parts[5]) || 0;
      
      const allBookings = await db.getBookings(MAIN_BOT_ID);
      const booking = allBookings.find(b => b.id === bookingId);
      
      if (!booking) {
        await ctx.editMessageText('Запись не найдена', {
          reply_markup: { inline_keyboard: [[{ text: '🔙 Назад', callback_data: `my_bookings_${type}_${page}` }]] }
        });
        return;
      }
      
      const { text, keyboard } = getUserBookingDetail(booking, type, page);
      await ctx.editMessageText(text, keyboard);
      return;
    }
    
    // ========== ОТМЕНА ЗАПИСИ КЛИЕНТОМ ==========
    if (callbackData.startsWith('my_booking_cancel_')) {
      const bookingId = parseInt(callbackData.replace('my_booking_cancel_', ''));
      await db.updateBookingStatus(MAIN_BOT_ID, bookingId, 'cancelled_by_user');
      
      const allBookings = await db.getBookings(MAIN_BOT_ID);
      const booking = allBookings.find(b => b.id === bookingId);
      
      if (booking) {
        const { text, keyboard } = getUserBookingDetail(booking, 'upcoming', 0);
        await ctx.editMessageText(text + '\n\n❌ Запись отменена вами', keyboard);
      }
      return;
    }
    
    // ========== МЕНЮ АДМИНА ==========
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
      const bookingId = parseInt(callbackData.replace('booking_view_', ''));
      const allBookings = await db.getAllBookings(MAIN_BOT_ID);
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
      const bookingId = parseInt(callbackData.replace('booking_cancel_', ''));
      await db.updateBookingStatus(MAIN_BOT_ID, bookingId, 'cancelled');
      
      const booking = (await db.getAllBookings(MAIN_BOT_ID)).find(b => b.id === bookingId);
      if (booking) {
        const { text, keyboard } = getBookingCard(booking);
        await ctx.editMessageText(text + '\n❌ Запись отменена', keyboard);
      }
      return;
    }
    
    // Удаление записи
    if (callbackData.startsWith('booking_delete_')) {
      const bookingId = parseInt(callbackData.replace('booking_delete_', ''));
      await db.deleteBooking(MAIN_BOT_ID, bookingId);
      
      // Возвращаемся к списку
      const { text, keyboard } = await getBookingsListPage(0);
      await ctx.editMessageText(text + '\n🗑 Запись удалена', { reply_markup: { inline_keyboard: keyboard } });
      return;
    }
    // ========== ОБРАБОТКА ADD_BOT ==========
    if (callbackData === 'addbot_start') {
      await ctx.editMessageText(
        '🤖 Создание нового бота для бизнеса\n\n' +
        'Пожалуйста, отправьте токен бота, полученный от @BotFather\n\n' +
        'Формат: просто отправьте токен в формате XXXXX:XXXXXXXXXXXXX',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_menu' }]
            ]
          }
        }
      );
      return;
    }
    
    // Обработка callback "Добавить бота" из меню
    if (callbackData === 'addbot_confirm_token') {
      await ctx.editMessageText(
        '🤖 Создание нового бота\n\n' +
        'Введите токен бота:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Отмена', callback_data: 'admin_menu' }]
            ]
          }
        }
      );
      return;
    }
  });

  // Обработка текстовых сообщений (для токена бота)
  bot.on('message:text', async (ctx: Context) => {
    const text = ctx.message?.text;
    const telegramId = ctx.from?.id;
    
    // Проверяем, ждём ли мы токен бота
    const isWaiting = telegramId ? pendingTokenStates.get(telegramId) : false;
    if (isWaiting && text && telegramId) {
      const botToken = text.trim();
      
      // Проверяем формат токена
      if (!botToken.includes(':') || botToken.split(':').length !== 2) {
        await ctx.reply('❌ Неверный формат токена. Пример: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz');
        return;
      }
      
      await ctx.reply('⏳ Проверяю токен и создаю бота...');
      
      try {
        const result = await createChildBot(botToken, telegramId, ctx.from.first_name);
        
        if (result.success && result.bot) {
          const botUsername = result.bot.botUsername;
          const secretPath = result.bot.secretPath;
          const miniAppUrl = `${SERVER_URL}?bot_id=${result.bot.id}`;
          
          await ctx.reply(
            `✅ Бот успешно создан!\n\n` +
            `🤖 Username: @${botUsername}\n` +
            `🔗 Mini App: ${miniAppUrl}\n\n` +
            `Передайте эту ссылку вашему клиенту для использования.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '🛠 Админ-панель', web_app: { url: `${SERVER_URL}/admin?bot_id=${result.bot.id}` } }],
                  [{ text: '🔙 В меню', callback_data: 'admin_menu' }]
                ]
              }
            }
          );
        } else {
          await ctx.reply(`❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`);
        }
      } catch (err) {
        console.error('Error creating bot:', err);
        await ctx.reply('❌ Произошла ошибка при создании бота');
      }
      
      // Сбрасываем состояние
      if (telegramId) {
        pendingTokenStates.delete(telegramId);
      }
      return;
    }
    
    // Обычные сообщения - не отвечаем на произвольный текст
    // await ctx.reply('Я получил ваше сообщение: ' + text);
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
