import { Router } from 'express';
import { db } from './database.js';
import { scheduleRemindersForBooking, notifyAdminOfNewBooking } from './reminders.js';
import { ADMIN_IDS } from './index.js';

// Глобальная ссылка на бота (будет установлена из index.ts)
let globalBot: any = null;

export function setGlobalBot(bot: any) {
  globalBot = bot;
}

const router = Router();

// Проверка админа
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

function isAdmin(telegramId?: number): boolean {
  return telegramId ? ADMIN_IDS.includes(telegramId) : false;
}

// Middleware для проверки админа (Telegram или пароль)
function requireAdmin(req: any, res: any, next: any) {
  // Проверка по Telegram ID
  const telegramId = parseInt(req.headers['x-telegram-id'] as string || req.query.telegramId as string || '0');
  if (isAdmin(telegramId)) {
    return next();
  }
  
  // Проверка по паролю
  const password = req.headers['x-admin-password'] as string || req.query.adminPassword as string;
  if (password && password === ADMIN_PASSWORD) {
    return next();
  }
  
  return res.status(403).json({ error: 'Access denied' });
}

// Получить все услуги (только активные для клиентов)
router.get('/services', async (req, res) => {
  try {
    const services = await db.getServices(false);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// ========== ADMIN SERVICES ROUTES ==========

// Получить все услуги (включая неактивные)
router.get('/admin/services', requireAdmin, async (req, res) => {
  try {
    const services = await db.getServices(true);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Получить одну услугу
router.get('/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const service = await db.getServiceById(id);
    
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
router.post('/admin/services', requireAdmin, async (req, res) => {
  try {
    const { name, description, duration, price, photos } = req.body;
    
    if (!name || !duration || !price) {
      return res.status(400).json({ error: 'name, duration and price are required' });
    }
    
    const service = await db.createService({
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
router.put('/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description, duration, price, photos, isActive } = req.body;
    
    const service = await db.updateService(id, {
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
router.delete('/admin/services/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.deleteService(id);
    
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
router.patch('/admin/services/reorder', requireAdmin, async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array' });
    }
    
    await db.reorderServices(orderedIds);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reorder services' });
  }
});

// Получить доступные слоты на дату
router.get('/slots', async (req, res) => {
  try {
    const { date, duration } = req.query;
    
    if (!date || !duration) {
      return res.status(400).json({ error: 'date and duration are required' });
    }

    const serviceDuration = parseInt(duration as string, 10);
    const slots = await db.getAvailableSlots(date as string, serviceDuration);
    
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Получить занятые слоты на дату (для клиента)
router.get('/booked-slots', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'date is required' });
    }

    const bookings = await db.getBookingsByDate(date as string);
    const bufferTime = await db.getBufferTime();
    
    // Возвращаем только подтверждённые брони с учётом буфера
    const bookedSlots = bookings
      .filter(b => b.status === 'confirmed')
      .map(b => {
        // Вычисляем end time с учётом duration + buffer
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

// Сбросить все бронирования (для тестирования)
router.post('/reset-bookings', async (req, res) => {
  try {
    const { secret } = req.body;
    // Простой секрет для защиты
    if (secret !== 'booking-reset-2024') {
      return res.status(403).json({ error: 'Invalid secret' });
    }
    
    // Получаем текущую базу
    const allBookings = await db.getBookings();
    // Удаляем все брони
    for (const booking of allBookings) {
      await db.deleteBooking(booking.id);
    }
    
    res.json({ success: true, deleted: allBookings.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset bookings' });
  }
});

// Получить все бронирования
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await db.getBookings();
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Получить бронирования на дату
router.get('/bookings/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const bookings = await db.getBookingsByDate(date);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Создать бронирование
router.post('/bookings', async (req, res) => {
  try {
    const { serviceId, serviceName, date, time, duration, price, clientName, clientPhone, telegramId } = req.body;

    if (!serviceId || !date || !time || !duration || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Проверяем, что слот ещё доступен
    const slots = await db.getAvailableSlots(date, duration);
    if (!slots.includes(time)) {
      return res.status(409).json({ error: 'Time slot is no longer available' });
    }

    const booking = await db.createBooking({
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

    // Планируем напоминание для клиента
    await scheduleRemindersForBooking(booking);

    // Отправляем уведомление админу
    // Используем setTimeout чтобы не блокировать ответ
    setTimeout(async () => {
      // Динамически импортируем для избежания циклической зависимости
      const { Bot } = await import('grammy');
      const botToken = process.env.BOT_TOKEN;
      if (botToken && ADMIN_IDS.length > 0) {
        const tempBot = new Bot(botToken);
        await notifyAdminOfNewBooking(tempBot, booking, ADMIN_IDS);
      }
    }, 100);

    res.status(201).json(booking);
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Удалить бронирование
router.delete('/bookings/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.deleteBooking(id);
    
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// ========== SCHEDULE ROUTES ==========

// Получить расписание на день недели
router.get('/schedule', async (req, res) => {
  try {
    const { dayOfWeek } = req.query;
    const schedule = await db.getSchedule();
    
    if (dayOfWeek !== undefined) {
      const daySchedule = schedule.find(s => s.dayOfWeek === parseInt(dayOfWeek as string));
      return res.json(daySchedule || null);
    }
    
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// ========== ADMIN ROUTES ==========

// Проверить является ли пользователь админом
router.get('/admin/check', async (req, res) => {
  try {
    const { telegramId } = req.query;
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    const id = parseInt(telegramId as string);
    const isAdminUser = ADMIN_IDS.includes(id);
    
    res.json({ isAdmin: isAdminUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check admin' });
  }
});

// Получить все бронирования с фильтрами
router.get('/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const { date, status, startDate, endDate } = req.query;
    
    const filters: any = {};
    if (date) filters.date = date;
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    
    const bookings = await db.getAllBookings(filters);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Получить даты с бронированиями (для календаря)
router.get('/admin/bookings/dates', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    
    const dateCounts = await db.getBookedDates(startDate as string, endDate as string);
    res.json(dateCounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dates' });
  }
});

// Изменить статус бронирования
router.patch('/admin/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const booking = await db.updateBookingStatus(id, status);
    
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
router.delete('/admin/bookings/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await db.deleteBooking(id);
    
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// ========== USER BOOKINGS ROUTES ==========

// Получить записи текущего пользователя
router.get('/my-bookings', async (req, res) => {
  try {
    const telegramId = parseInt(req.headers['x-telegram-id'] as string || '0');
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    const upcoming = await db.getUserUpcomingBookings(telegramId);
    const past = await db.getUserPastBookings(telegramId);
    
    res.json({ upcoming, past });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Отменить свою запись
router.patch('/my-bookings/:id/cancel', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const telegramId = parseInt(req.headers['x-telegram-id'] as string || '0');
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    // Проверяем, что запись принадлежит этому пользователю
    const bookings = await db.getBookings();
    const booking = bookings.find(b => b.id === id && b.telegramId === telegramId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    await db.updateBookingStatus(id, 'cancelled');
    await db.deleteRemindersByBookingId(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// Перенести запись на другую дату/время
router.patch('/my-bookings/:id/reschedule', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date, time } = req.body;
    const telegramId = parseInt(req.headers['x-telegram-id'] as string || '0');
    
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId required' });
    }
    
    if (!date || !time) {
      return res.status(400).json({ error: 'date and time are required' });
    }
    
    // Проверяем, что запись принадлежит этому пользователю
    const bookings = await db.getBookings();
    const booking = bookings.find(b => b.id === id && b.telegramId === telegramId);
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    // Проверяем, что новое время доступно
    const slots = await db.getAvailableSlots(date, booking.duration);
    if (!slots.includes(time)) {
      return res.status(409).json({ error: 'Time slot is no longer available' });
    }
    
    // Обновляем запись
    const updatedBooking = await db.updateBooking(id, { date, time });
    
    if (!updatedBooking) {
      return res.status(500).json({ error: 'Failed to update booking' });
    }
    
    // Удаляем старые напоминания и создаём новые
    await db.deleteRemindersByBookingId(id);
    await scheduleRemindersForBooking(updatedBooking);
    
    res.json(updatedBooking);
  } catch (error) {
    console.error('Reschedule error:', error);
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

// ========== REMINDER SETTINGS ROUTES ==========

// Получить настройки напоминаний
router.get('/admin/reminder-settings', requireAdmin, async (req, res) => {
  try {
    const settings = await db.getReminderSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminder settings' });
  }
});

// Обновить настройки напоминаний
router.put('/admin/reminder-settings', requireAdmin, async (req, res) => {
  try {
    const { enabled, defaultMinutesBefore, customReminders } = req.body;
    
    const settings = await db.updateReminderSettings({
      ...(enabled !== undefined && { enabled }),
      ...(defaultMinutesBefore !== undefined && { defaultMinutesBefore }),
      ...(customReminders !== undefined && { customReminders }),
    });
    
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reminder settings' });
  }
});

export default router;
