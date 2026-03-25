import { Router } from 'express';
import { db } from './database.js';
import { botFilter, requireOwner, AuthenticatedRequest } from './middleware.js';
import { ADMIN_IDS } from './index.js';

const router = Router();

// Проверка админа
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

// Получить botId из запроса (из middleware или по умолчанию 1 для обратной совместимости)
function getBotId(req: AuthenticatedRequest): number {
  return req.botId || 1;
}

// Получить telegramId из заголовка (может быть string | string[])
function getTelegramId(req: AuthenticatedRequest): number {
  const header = req.headers['x-telegram-id'];
  if (!header) return 0;
  const str = Array.isArray(header) ? header[0] : header;
  return parseInt(str, 10) || 0;
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
    const { serviceId, serviceName, date, time, duration, price, clientName, clientPhone, telegramId } = req.body;

    if (!serviceId || !date || !time || !duration || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
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

// ========== BOT MANAGEMENT ROUTES (для главного бота) ==========

// Получить информацию о боте по ID
router.get('/bots/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
router.post('/bots', async (req, res) => {
  try {
    const { telegramBotId, secretPath, botToken, botUsername, ownerId, ownerName } = req.body;
    
    if (!telegramBotId || !secretPath || !botToken || !botUsername || !ownerId || !ownerName) {
      return res.status(400).json({ error: 'All fields are required' });
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
    });
    
    // Seed данные для нового бота
    await db.seedBotData(bot.id);
    
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
    const id = parseInt(req.params.id);
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

export default router;
