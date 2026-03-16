import { Router } from 'express';
import { db } from './database.js';

const router = Router();

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

export default router;
