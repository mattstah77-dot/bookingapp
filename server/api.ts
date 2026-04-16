import { Router } from 'express';
import { db } from './database.js';
import { botFilter, requireOwner, AuthenticatedRequest } from './middleware.js';
import { ADMIN_IDS } from './index.js';
import { handlerRegistry } from './handlers/registry.js';

const router = Router();

// Проверка админа
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Получить botId из запроса (middleware уже проверил, что бот существует)
function getBotId(req: AuthenticatedRequest): number {
  if (!req.botId) {
    throw new Error('Bot ID is required. Authentication failed.');
  }
  return req.botId;
}

// Получить telegramId из заголовка (может быть string | string[])
// Получить telegramId из заголовка (может быть string | string[])
function getTelegramId(req: any): number {
 const header = (req.headers as any)["x-telegram-id"];
 const str = header ? (Array.isArray(header) ? header[0] : header) : "";
 return parseInt(str,10) ||0;
}

// Middleware для проверки админа (Telegram или пароль)
function requireAdmin(req: AuthenticatedRequest, res: any, next: any) {
  const telegramIdStr = Array.isArray(req.headers['x-telegram-id']) 
    ? req.headers['x-telegram-id'][0] 
    : (req.headers['x-telegram-id'] as string || '');
  const telegramId = parseInt(telegramIdStr || req.query.telegramId as string || '0');
  if (telegramId && ADMIN_IDS.includes(telegramId)) {
    return next();
  }
  
  const passwordRaw = req.headers['x-admin-password'];
  const password = Array.isArray(passwordRaw) ? passwordRaw[0] : (passwordRaw as string || '');
  if (password && password === ADMIN_PASSWORD) {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied' });
}

// ========== PUBLIC ROUTES ==========

// Получить список всех доступных типов ботов (только активные и публичные)
router.get('/bot-types', async (req, res) => {
  try {
    const types = handlerRegistry.getPublicMetaList();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bot types' });
  }
});

// Получить доступные типы ботов для текущего пользователя
router.get('/user/bot-types', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const ownerId = req.bot?.ownerId;

    if (!ownerId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Проверяем, есть ли у пользователя какие-либо доступы
    const currentTypes = await db.getUserBotTypes(ownerId);
    
    // Если у пользователя нет никаких доступов, выдаём базовый 'leads'
    if (currentTypes.length === 0) {
      await db.grantUserBotType(ownerId, 'leads');
      currentTypes.push('leads');
    }

    // Доступные пользователю типы
    const available = currentTypes;
    
    // Все доступные типы из registry
    const all = handlerRegistry.getPublicMetaList();
    
    res.json({
      available,
      all,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user bot types' });
  }
});

// Получить все услуги (только активные для клиентов) - с bot_id
router.get('/services', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const services = await db.getServices(botId, false);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Получить доступные слоты на дату - с bot_id
router.get('/slots', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { date, duration } = req.query;
    
    if (!date || !duration) {
      return res.status(400).json({ error: 'date and duration are required' });
    }

    const serviceDuration = parseInt(duration as string, 10);
    const slots = await db.getAvailableSlots(botId, date as string, serviceDuration);
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Получить занятые слоты на дату (для клиента) - с bot_id
router.get('/booked-slots', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }
    
    const bookings = await db.getBookingsByDate(botId, date as string);
    const bufferTime = await db.getBufferTime(botId);
    
    const bookedSlots = bookings
      .filter(b => b.status === 'confirmed')
      .map(b => {
        const totalMinutes = parseInt(b.time.split(':')[0]) * 60 + 
                            parseInt(b.time.split(':')[1]) + 
                            b.duration + 
                            bufferTime;
        
        const endHours = Math.floor(totalMinutes / 60);
        const endMins = totalMinutes % 60;
        
        return {
          start: b.time,
          end: `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`,
        };
      });
    
    res.json(bookedSlots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booked slots' });
  }
});

// Получить расписание - с bot_id
router.get('/schedule', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { dayOfWeek } = req.query;
    const schedule = await db.getSchedule(botId);
    
    if (dayOfWeek !== undefined) {
      const daySchedule = schedule.find(s => s.dayOfWeek === parseInt(dayOfWeek as string));
      return res.json(daySchedule || null);
    }
    
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Создать бронирование - с bot_id
router.post('/bookings', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const telegramId = getTelegramId(req);
    const { serviceId, serviceName, date, time, duration, price, clientName, clientPhone } = req.body;
    
    if (!serviceId || !date || !time || !duration || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!telegramId) {
      return res.status(400).json({ error: 'Telegram ID is required' });
    }
    
    // Проверяем лимит активных бронирований
    const maxActiveBookings = await db.getMaxActiveBookings(botId);
    const currentBookingsCount = await db.getUserActiveBookingsCount(botId, telegramId);

    if (currentBookingsCount >= maxActiveBookings) {
      return res.status(403).json({
        error: 'Maximum number of active bookings reached',
        limit: maxActiveBookings,
        current: currentBookingsCount,
      });
    }
    
    // Проверяем, что слот ещё доступен
    const slots = await db.getAvailableSlots(botId, date, duration);
    if (!slots.includes(time)) {
      return res.status(409).json({ error: 'Time slot is no longer available' });
    }
    
    const booking = await db.createBooking(botId, {
      serviceId: parseInt(serviceId),
      serviceName: serviceName || '',
      date,
      time,
      duration,
      price,
      clientName,
      clientPhone,
      telegramId,
    });
    
    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Booking error:', error);
    if (error.message === 'Time slot is already booked') {
      res.status(409).json({ error: 'Time slot is already booked' });
    } else {
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }
});

// Получить записи текущего пользователя - с bot_id
router.get('/my-bookings', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const telegramId = getTelegramId(req);

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    const upcoming = await db.getUserUpcomingBookings(botId, telegramId);
    const past = await db.getUserPastBookings(botId, telegramId);
    
    res.json({ upcoming, past });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Отменить свою запись - с bot_id
router.patch('/my-bookings/:id/cancel', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const telegramId = getTelegramId(req);
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }

    const bookings = await db.getBookings(botId);
    let booking = bookings.find(b => b.id === id && b.telegramId === telegramId);
    
    if (!booking) {
      booking = bookings.find(b => b.id === id);
    }
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    await db.updateBookingStatus(botId, id, 'cancelled_by_user');
    await db.deleteRemindersByBookingId(botId, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[CANCEL] error:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Перенести запись на другую дату/время - с bot_id
router.patch('/my-bookings/:id/reschedule', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const { date, time } = req.body;
    const telegramId = getTelegramId(req);

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    if (!date || !time) {
      return res.status(400).json({ error: 'date and time are required' });
    }
    
    const bookings = await db.getBookings(botId);
    let booking = bookings.find(b => b.id === id && b.telegramId === telegramId);
    
    if (!booking) {
      booking = bookings.find(b => b.id === id);
    }
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Проверяем, что новое время доступно
    const slots = await db.getAvailableSlots(botId, date, booking.duration);
    if (!slots.includes(time)) {
      return res.status(409).json({ error: 'Time slot is no longer available' });
    }
    
    // Обновляем запись
    const updatedBooking = await db.updateBooking(botId, id, { date, time });
    
    if (!updatedBooking) {
      return res.status(500).json({ error: 'Failed to update booking' });
    }
    
    // Удаляем старые напоминания
    await db.deleteRemindersByBookingId(botId, id);
    
    res.json(updatedBooking);
  } catch (error) {
    console.error('[RESCHEDULE] error:', error);
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

// ========== ADMIN SERVICES ROUTES (только для владельца бота) ==========

// Получить все услуги (включая неактивные)
router.get('/admin/services', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const services = await db.getServices(botId, true);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Получить одну услугу
router.get('/admin/services/:id', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const service = await db.getServiceById(botId, id);
    
    if (service) {
      res.json(service);
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// Создать услугу
router.post('/admin/services', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { name, description, duration, price, photos } = req.body;
    
    if (!name || !duration || !price) {
      return res.status(400).json({ error: 'name, duration and price are required' });
    }
    
    const service = await db.createService(botId, {
      name,
      description: description || '',
      duration,
      price,
      category: undefined,
      photos: photos || [],
      sortOrder: 0,
      isActive: true,
    });
    
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Обновить услугу
router.put('/admin/services/:id', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const { name, description, duration, price, photos, isActive } = req.body;
    
    const service = await db.updateService(botId, id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(duration && { duration }),
      ...(price && { price }),
      ...(photos && { photos }),
      ...(isActive !== undefined && { isActive }),
    });
    
    if (service) {
      res.json(service);
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Удалить услугу
router.delete('/admin/services/:id', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const deleted = await db.deleteService(botId, id);
    
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Service not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

// Изменить порядок услуг
router.patch('/admin/services/reorder', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }
    
    await db.reorderServices(botId, orderedIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder services' });
  }
});

// ========== ADMIN BOOKINGS ROUTES ==========

// Проверить является ли пользователь владельцем бота
router.get('/admin/check', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const telegramId = getTelegramId(req);
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    const isOwner = req.bot?.ownerId === telegramId;
    res.json({ isAdmin: isOwner });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check admin' });
  }
});

// Получить все бронирования с фильтрами
router.get('/admin/bookings', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { date, status, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (date) filters.date = date;
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    
    const bookings = await db.getAllBookings(botId, filters);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Получить даты с бронированиями (для календаря)
router.get('/admin/bookings/dates', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const dateCounts = await db.getBookedDates(botId, startDate as string, endDate as string);
    res.json(dateCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

// Изменить статус бронирования
router.patch('/admin/bookings/:id', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const { status } = req.body;
    
    if (!status || !['confirmed', 'cancelled', 'cancelled_by_admin', 'completed', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const booking = await db.updateBookingStatus(botId, id, status);
    
    if (booking) {
      res.json(booking);
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// Удалить бронирование (админ)
router.delete('/admin/bookings/:id', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const id = parseInt(req.params.id as string);
    const deleted = await db.deleteBooking(botId, id);
    
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// ========== REMINDER SETTINGS ROUTES ==========

// Получить настройки напоминаний
router.get('/admin/reminder-settings', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const settings = await db.getReminderSettings(botId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminder settings' });
  }
});

// Обновить настройки напоминаний
router.put('/admin/reminder-settings', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { enabled, defaultMinutesBefore, customReminders } = req.body;
    
    const settings = await db.updateReminderSettings(botId, {
      ...(enabled !== undefined && { enabled }),
      ...(defaultMinutesBefore !== undefined && { defaultMinutesBefore }),
      ...(customReminders !== undefined && { customReminders }),
    });
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reminder settings' });
  }
});

// Получить лимит активных бронирований
router.get('/admin/booking-limit', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const limit = await db.getMaxActiveBookings(botId);
    res.json({ maxActiveBookings: limit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking limit' });
  }
});

// Установить лимит активных бронирований
router.put('/admin/booking-limit', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const { maxActiveBookings } = req.body;
    
    if (typeof maxActiveBookings !== 'number' || maxActiveBookings < 1 || maxActiveBookings > 100) {
      return res.status(400).json({ error: 'Limit must be between 1 and 100' });
    }
    
    await db.setMaxActiveBookings(botId, maxActiveBookings);
    res.json({ maxActiveBookings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking limit' });
  }
});

// ========== BOT MANAGEMENT ROUTES (для главного бота) ==========

// Получить информацию о боте по ID
router.get('/bots/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const bot = await db.getBotById(id);
    
    if (bot) {
      // Не возвращаем токен
      const { bot_token, ...safeBot } = bot;
      res.json(safeBot);
    } else {
      res.status(404).json({ error: 'Bot not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bot' });
  }
});

// Создать нового бота (добавляет бота в систему)
// С проверкой лимитов и доступа к типу бота
router.post('/bots', async (req, res) => {
  try {
    const { telegramBotId, secretPath, botToken, botUsername, ownerId, ownerName, type } = req.body;
    
    if (!telegramBotId || !secretPath || !botToken || !botUsername || !ownerId || !ownerName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const botType = type || 'leads';

    if (!['booking', 'leads'].includes(botType)) {
      return res.status(400).json({ error: 'Invalid type. Must be "booking" or "leads"' });
    }

    // 1. ПРОВЕРКА ДОСТУПА К ТИПУ БОТА
    const allowedTypes = await db.getUserBotTypes(ownerId);
    if (!allowedTypes.includes(botType)) {
      return res.status(403).json({ 
        error: `Bot type '${botType}' is not allowed for this user`,
        allowedTypes,
      });
    }

    // 2. ПРОВЕРКА ЛИМИТА БОТОВ
    const limitCheck = await db.canUserCreateBot(ownerId);
    if (!limitCheck.canCreate) {
      return res.status(403).json({
        error: `Bot limit reached. Current: ${limitCheck.currentCount}, Max: ${limitCheck.maxBots}`,
        currentCount: limitCheck.currentCount,
        maxBots: limitCheck.maxBots,
      });
    }
    
    // Создаём бота
    const bot = await db.createBot({
      telegramBotId,
      secretPath,
      botToken,
      botUsername,
      ownerId,
      ownerName,
      isActive: true,
      status: 'success',
      type: botType,
    });
    
    // Seed данные для нового бота (только для booking)
    if (botType === 'booking') {
      await db.seedBotData(bot.id);
    }
    
    res.status(201).json(bot);
  } catch (error: any) {
    console.error('Failed to create bot:', error);
    if (error.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Bot already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create bot' });
    }
  }
});

// Обновить бота
router.put('/bots/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { telegramBotId, botToken, botUsername, isActive, status } = req.body;
    
    const bot = await db.updateBot(id, {
      telegramBotId,
      botToken,
      botUsername,
      isActive,
      status,
    });
    
    if (bot) {
      res.json(bot);
    } else {
      res.status(404).json({ error: 'Bot not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

// Удалить бота по telegram_bot_id (временный эндпоинт для отладки)
router.delete('/bots/by-telegram-id/:telegramBotId', async (req, res) => {
  try {
    const telegramBotId = req.params.telegramBotId;
    const deleted = await db.deleteBotByTelegramId(telegramBotId);
    
    if (deleted) {
      res.json({ success: true, message: `Bot ${telegramBotId} deleted` });
    } else {
      res.status(404).json({ error: 'Bot not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bot' });
  }
});

// ========== УНИВЕРСАЛЬНЫЕ API ЭНДПОИНТЫ (ДЛЯ КОНСТРУКТОРА БОТОВ) ==========

// Импорт обработчиков
import { getClientData, handleBotAction, getBotStats, getAdminData } from './handlers/index.js';

// Получить тип бота
router.get('/bots/:id/type', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const type = await db.getBotType(id);
    res.json({ botId: id, type });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bot type' });
  }
});

// Изменить тип бота
router.patch('/bots/:id/type', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { type } = req.body;
    const ownerId = req.bot?.ownerId;

    if (!ownerId) {
      return res.status(400).json({ error: 'Owner ID is required' });
    }

    if (!['booking', 'leads'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "booking" or "leads"' });
    }

    // Проверяем, что пользователю разрешён этот тип бота
    const allowedTypes = await db.getUserBotTypes(ownerId);
    if (!allowedTypes.includes(type)) {
      return res.status(403).json({ 
        error: 'Bot type not allowed for this user',
        allowedTypes 
      });
    }

    await db.setBotType(id, type as 'booking' | 'leads');
    res.json({ success: true, type });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bot type' });
  }
});

// Универсальный эндпоинт: получить данные для клиента (mini-app)
router.get('/bots/:id/data', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const telegramId = getTelegramId(req);

    const data = await getClientData(botId, telegramId || undefined);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[GET DATA] error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch data' });
  }
});

// Универсальный эндпоинт: обработать действие клиента
// Формат: { "action": "create_booking", "payload": { ... } }
router.post('/bots/:id/action', botFilter, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const telegramId = getTelegramId(req);
    const { action, payload } = req.body;

    if (!action) {
      return res.status(400).json({ success: false, error: 'action is required' });
    }

    const result = await handleBotAction(botId, action, payload || {}, telegramId || undefined);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[ACTION] error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process action' });
  }
});

// Универсальный эндпоинт: получить статистику
router.get('/bots/:id/stats', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);

    const stats = await getBotStats(botId);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('[STATS] error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch stats' });
  }
});

// Универсальный эндпоинт: получить данные для админки
router.get('/bots/:id/admin', botFilter, requireOwner, async (req: AuthenticatedRequest, res) => {
  try {
    const botId = getBotId(req);
    const ownerId = req.bot?.ownerId;

    const data = await getAdminData(botId, ownerId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[ADMIN DATA] error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch admin data' });
  }
});

export default router;
