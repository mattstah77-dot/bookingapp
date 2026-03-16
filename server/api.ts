import { Router } from 'express';
import { db } from './database.js';

const router = Router();

// Проверка админа
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

function isAdmin(telegramId?: number): boolean {
  return telegramId ? ADMIN_IDS.includes(telegramId) : false;
}

// Middleware для проверки админа
function requireAdmin(req: any, res: any, next: any) {
  // Получаем Telegram ID из заголовка или query
  const telegramId = parseInt(req.headers['x-telegram-id'] as string || req.query.telegramId as string || '0');
  
  if (!isAdmin(telegramId)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// Получить все услуги
router.get('/services', async (req, res) => {
  try {
    const services = await db.getServices();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch services' });
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
      serviceId,
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
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// Удалить бронирование
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
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

// ========== ADMIN ROUTES ==========

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
    const { id } = req.params;
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
    const { id } = req.params;
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

export default router;
