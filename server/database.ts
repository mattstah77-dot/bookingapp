import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { 
  pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb 
} from 'drizzle-orm/pg-core';

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

// ========== ТАБЛИЦЫ ==========

// Услуги
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  category: varchar('category', { length: 100 }),
  photos: jsonb('photos').$type<string[]>().default([]),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
});

// Записи
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  serviceId: integer('service_id').notNull(),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  time: varchar('time', { length: 5 }).notNull(),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  status: varchar('status', { length: 20 }).default('confirmed'),
  clientName: varchar('client_name', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 20 }),
  telegramId: integer('telegram_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Расписание
export const schedule = pgTable('schedule', {
  id: serial('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(),
  endTime: varchar('end_time', { length: 5 }).notNull(),
  breakStart: varchar('break_start', { length: 5 }),
  breakEnd: varchar('break_end', { length: 5 }),
});

// Настройки
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').$type<any>(),
});

// Напоминания
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id').notNull(),
  telegramId: integer('telegram_id').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  sent: boolean('sent').default(false),
  message: text('message'),
});

// ========== ТИПЫ ==========

export interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  price: number;
  category?: string;
  photos?: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface Booking {
  id: number;
  serviceId: number;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled';
  clientName?: string;
  clientPhone?: string;
  telegramId?: number;
  createdAt: Date;
}

export interface Schedule {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface ReminderSettings {
  enabled: boolean;
  defaultMinutesBefore: number;
  customReminders: { serviceId: number; minutesBefore: number }[];
}

export interface ScheduledReminder {
  id: number;
  bookingId: number;
  telegramId: number;
  scheduledFor: Date;
  sent: boolean;
  message?: string;
}

// ========== КЛАСС БД ==========

class PostgresDatabase {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async init(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        duration INTEGER NOT NULL,
        price INTEGER NOT NULL,
        category VARCHAR(100),
        photos JSONB DEFAULT '[]',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        date VARCHAR(10) NOT NULL,
        time VARCHAR(5) NOT NULL,
        duration INTEGER NOT NULL,
        price INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'confirmed',
        client_name VARCHAR(255),
        client_phone VARCHAR(20),
        telegram_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        day_of_week INTEGER NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        break_start VARCHAR(5),
        break_end VARCHAR(5)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value JSONB
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        telegram_id INTEGER NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        sent BOOLEAN DEFAULT false,
        message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
      CREATE INDEX IF NOT EXISTS idx_bookings_telegram_id ON bookings(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for, sent);
    `);

    const servicesCount = await this.pool.query('SELECT COUNT(*) FROM services');
    if (parseInt(servicesCount.rows[0].count) === 0) {
      await this.seedDefaultData();
    }

    console.log('✅ PostgreSQL database initialized');
  }

  private async seedDefaultData(): Promise<void> {
    await this.pool.query(`
      INSERT INTO services (name, description, duration, price, sort_order, is_active) VALUES
      ('Стрижка', 'Стрижка + укладка', 45, 1500, 1, true),
      ('Стрижка бороды', 'Коррекция бороды', 30, 800, 2, true),
      ('Комплекс', 'Стрижка + борода', 60, 2000, 3, true),
      ('Бритьё опасной бритвой', 'Традиционное бритьё', 40, 1200, 4, true)
    `);

    await this.pool.query(`
      INSERT INTO schedule (day_of_week, start_time, end_time, break_start, break_end) VALUES
      (1, '10:00', '20:00', '14:00', '15:00'),
      (2, '10:00', '20:00', '14:00', '15:00'),
      (3, '10:00', '20:00', '14:00', '15:00'),
      (4, '10:00', '20:00', '14:00', '15:00'),
      (5, '10:00', '20:00', '14:00', '15:00'),
      (6, '10:00', '18:00', NULL, NULL)
    `);

    await this.pool.query(`
      INSERT INTO settings (key, value) VALUES 
      ('reminderSettings', '{"enabled": true, "defaultMinutesBefore": 120, "customReminders": []}'),
      ('bufferTime', 15)
    `);

    console.log('📝 Default data seeded');
  }

  // Services
  async getServices(includeInactive = false): Promise<Service[]> {
    const query = includeInactive 
      ? 'SELECT * FROM services ORDER BY sort_order'
      : 'SELECT * FROM services WHERE is_active = true ORDER BY sort_order';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getServiceById(id: number): Promise<Service | undefined> {
    const result = await this.pool.query('SELECT * FROM services WHERE id = $1', [id]);
    return result.rows[0];
  }

  async createService(service: Omit<Service, 'id'>): Promise<Service> {
    const maxOrder = await this.pool.query('SELECT COALESCE(MAX(sort_order), 0) as max FROM services');
    const sortOrder = maxOrder.rows[0].max + 1;

    const result = await this.pool.query(
      `INSERT INTO services (name, description, duration, price, category, photos, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
      [service.name, service.description || '', service.duration, service.price, service.category || null, JSON.stringify(service.photos || []), sortOrder]
    );
    return result.rows[0];
  }

  async updateService(id: number, updates: Partial<Service>): Promise<Service | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(updates.name); }
    if (updates.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(updates.description); }
    if (updates.duration !== undefined) { fields.push(`duration = $${paramIndex++}`); values.push(updates.duration); }
    if (updates.price !== undefined) { fields.push(`price = $${paramIndex++}`); values.push(updates.price); }
    if (updates.category !== undefined) { fields.push(`category = $${paramIndex++}`); values.push(updates.category); }
    if (updates.photos !== undefined) { fields.push(`photos = $${paramIndex++}`); values.push(JSON.stringify(updates.photos)); }
    if (updates.sortOrder !== undefined) { fields.push(`sort_order = $${paramIndex++}`); values.push(updates.sortOrder); }
    if (updates.isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(updates.isActive); }

    if (fields.length === 0) return this.getServiceById(id);

    values.push(id);
    const result = await this.pool.query(
      `UPDATE services SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM services WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async reorderServices(orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.pool.query('UPDATE services SET sort_order = $1 WHERE id = $2', [i + 1, orderedIds[i]]);
    }
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    const result = await this.pool.query('SELECT * FROM bookings ORDER BY date, time');
    return result.rows;
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    const result = await this.pool.query('SELECT * FROM bookings WHERE date = $1', [date]);
    return result.rows;
  }

  async createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'status'>): Promise<Booking> {
    const result = await this.pool.query(
      `INSERT INTO bookings (service_id, service_name, date, time, duration, price, status, client_name, client_phone, telegram_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', $7, $8, $9) RETURNING *`,
      [booking.serviceId, booking.serviceName, booking.date, booking.time, booking.duration, booking.price, booking.clientName || null, booking.clientPhone || null, booking.telegramId || null]
    );
    return result.rows[0];
  }

  async updateBookingStatus(id: number, status: 'confirmed' | 'cancelled'): Promise<Booking | null> {
    const result = await this.pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0] || null;
  }

  async updateBooking(id: number, updates: Partial<Pick<Booking, 'date' | 'time'>>): Promise<Booking | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.date !== undefined) { fields.push(`date = $${paramIndex++}`); values.push(updates.date); }
    if (updates.time !== undefined) { fields.push(`time = $${paramIndex++}`); values.push(updates.time); }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await this.pool.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async getAllBookings(filters: { date?: string; status?: string; startDate?: string; endDate?: string } = {}): Promise<Booking[]> {
    let query = 'SELECT * FROM bookings WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.date) { query += ` AND date = $${paramIndex++}`; params.push(filters.date); }
    if (filters.status) { query += ` AND status = $${paramIndex++}`; params.push(filters.status); }
    if (filters.startDate && filters.endDate) { 
      query += ` AND date >= $${paramIndex++} AND date <= $${paramIndex++}`; 
      params.push(filters.startDate, filters.endDate); 
    }

    query += ' ORDER BY date, time';
    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getBookedDates(startDate: string, endDate: string): Promise<Record<string, number>> {
    const result = await this.pool.query(
      `SELECT date, COUNT(*) as count FROM bookings 
       WHERE status = 'confirmed' AND date >= $1 AND date <= $2 
       GROUP BY date`,
      [startDate, endDate]
    );
    const counts: Record<string, number> = {};
    result.rows.forEach(row => { counts[row.date] = parseInt(row.count); });
    return counts;
  }

  async deleteBooking(id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM bookings WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Schedule
  async getSchedule(): Promise<Schedule[]> {
    const result = await this.pool.query('SELECT * FROM schedule ORDER BY day_of_week');
    return result.rows;
  }

  async getBufferTime(): Promise<number> {
    const result = await this.pool.query("SELECT value FROM settings WHERE key = 'bufferTime'");
    if (result.rows.length === 0) return 15;
    return typeof result.rows[0].value === 'number' ? result.rows[0].value : 15;
  }

  async getAvailableSlots(date: string, serviceDuration: number): Promise<string[]> {
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const daySchedule = await this.pool.query(
      'SELECT * FROM schedule WHERE day_of_week = $1',
      [dayOfWeek]
    );

    if (daySchedule.rows.length === 0) return [];

    const schedule = daySchedule.rows[0];
    const bookings = await this.getBookingsByDate(date);
    const bufferTime = await this.getBufferTime();

    const slots: string[] = [];
    const [startHour, startMin] = schedule.start_time.split(':').map(Number);
    const [endHour, endMin] = schedule.end_time.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    const serviceEndLimit = endTime - serviceDuration;

    while (currentTime <= serviceEndLimit) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      let isBreak = false;
      if (schedule.break_start && schedule.break_end) {
        const [breakStartH, breakStartM] = schedule.break_start.split(':').map(Number);
        const [breakEndH, breakEndM] = schedule.break_end.split(':').map(Number);
        const breakStart = breakStartH * 60 + breakStartM;
        const breakEnd = breakEndH * 60 + breakEndM;

        if (currentTime < breakEnd && (currentTime + serviceDuration) > breakStart) {
          isBreak = true;
        }
      }

      if (!isBreak) {
        const isAvailable = !bookings.some(booking => {
          const [bookH, bookM] = booking.time.split(':').map(Number);
          const bookStart = bookH * 60 + bookM;
          const bookEnd = bookStart + booking.duration + bufferTime;
          return (currentTime < bookEnd && (currentTime + serviceDuration + bufferTime) > bookStart);
        });

        if (isAvailable) slots.push(timeStr);
      }

      currentTime += 15;
    }

    return slots;
  }

  async getUserUpcomingBookings(telegramId: number): Promise<Booking[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.pool.query(
      `SELECT * FROM bookings WHERE telegram_id = $1 AND date >= $2 AND status = 'confirmed' ORDER BY date, time`,
      [telegramId, today]
    );
    return result.rows;
  }

  async getUserPastBookings(telegramId: number): Promise<Booking[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.pool.query(
      `SELECT * FROM bookings WHERE telegram_id = $1 AND (date < $2 OR status = 'cancelled') ORDER BY date DESC, time DESC`,
      [telegramId, today]
    );
    return result.rows;
  }

  async getReminderSettings(): Promise<ReminderSettings> {
    const result = await this.pool.query("SELECT value FROM settings WHERE key = 'reminderSettings'");
    if (result.rows.length === 0) {
      return { enabled: true, defaultMinutesBefore: 120, customReminders: [] };
    }
    return result.rows[0].value;
  }

  async updateReminderSettings(updates: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const current = await this.getReminderSettings();
    const updated = { ...current, ...updates };
    
    await this.pool.query(
      "INSERT INTO settings (key, value) VALUES ('reminderSettings', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
      [JSON.stringify(updated)]
    );
    
    return updated;
  }

  async createReminder(bookingId: number, telegramId: number, scheduledFor: string, message?: string): Promise<ScheduledReminder> {
    const result = await this.pool.query(
      'INSERT INTO reminders (booking_id, telegram_id, scheduled_for, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [bookingId, telegramId, scheduledFor, message || null]
    );
    return result.rows[0];
  }

  async getPendingReminders(): Promise<ScheduledReminder[]> {
    const result = await this.pool.query(
      "SELECT * FROM reminders WHERE sent = false AND scheduled_for <= NOW()"
    );
    return result.rows;
  }

  async markReminderSent(id: number): Promise<void> {
    await this.pool.query('UPDATE reminders SET sent = true WHERE id = $1', [id]);
  }

  async deleteRemindersByBookingId(bookingId: number): Promise<void> {
    await this.pool.query('DELETE FROM reminders WHERE booking_id = $1', [bookingId]);
  }
}

export const db = new PostgresDatabase();
