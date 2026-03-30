import { Pool } from 'pg';
import { 
  pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb 
} from 'drizzle-orm/pg-core';

// Подключение к PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ========== ТАБЛИЦЫ ==========

// Таблица ботов (Multi-tenant)
export const bots = pgTable('bots', {
  id: serial('id').primaryKey(),
  telegramBotId: varchar('telegram_bot_id', { length: 50 }).notNull().unique(),
  secretPath: varchar('secret_path', { length: 64 }).notNull().unique(),
  botToken: text('bot_token').notNull(), // Зашифрованный токен
  botUsername: varchar('bot_username', { length: 100 }).notNull(),
  ownerId: integer('owner_id').notNull(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  status: varchar('status', { length: 20 }).default('creating'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Услуги (с bot_id для изоляции)
export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').notNull(), // FK на bots
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  category: varchar('category', { length: 100 }),
  photos: jsonb('photos').$type<string[]>().default([]),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
});

// Записи (с bot_id для изоляции)
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').notNull(), // FK на bots
  serviceId: integer('service_id').notNull(),
  serviceName: varchar('service_name', { length: 255 }).notNull(),
  date: varchar('date', { length: 10 }).notNull(),
  time: varchar('time', { length: 5 }).notNull(),
  duration: integer('duration').notNull(),
  price: integer('price').notNull(),
  status: varchar('status', { length: 20 }).default('confirmed'),
  cancelledBy: varchar('cancelled_by', { length: 20 }),
  clientName: varchar('client_name', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 20 }),
  telegramId: integer('telegram_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Расписание (с bot_id для изоляции)
export const schedule = pgTable('schedule', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').notNull(), // FK на bots
  dayOfWeek: integer('day_of_week').notNull(),
  startTime: varchar('start_time', { length: 5 }).notNull(),
  endTime: varchar('end_time', { length: 5 }).notNull(),
  breakStart: varchar('break_start', { length: 5 }),
  breakEnd: varchar('break_end', { length: 5 }),
});

// Настройки (с bot_id для изоляции)
export const settings = pgTable('settings', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').notNull(), // FK на bots
  key: varchar('key', { length: 100 }).notNull(),
  value: jsonb('value').$type<any>(),
});

// Напоминания (с bot_id для изоляции)
export const reminders = pgTable('reminders', {
  id: serial('id').primaryKey(),
  botId: integer('bot_id').notNull(), // FK на bots
  bookingId: integer('booking_id').notNull(),
  telegramId: integer('telegram_id').notNull(),
  scheduledFor: timestamp('scheduled_for').notNull(),
  sent: boolean('sent').default(false),
  message: text('message'),
});

// ========== ТИПЫ ==========

export interface Service {
  id: number;
  botId: number;
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
  botId: number;
  serviceId: number;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled' | 'cancelled_by_user' | 'cancelled_by_admin' | 'completed' | 'no_show';
  cancelledBy?: 'user' | 'admin';
  clientName?: string;
  clientPhone?: string;
  telegramId?: number;
  createdAt: Date;
}

export interface Schedule {
  id: number;
  botId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface Settings {
  id: number;
  botId: number;
  key: string;
  value: any;
}

export interface ReminderSettings {
  enabled: boolean;
  defaultMinutesBefore: number;
  customReminders: { serviceId: number; minutesBefore: number }[];
}

export interface ScheduledReminder {
  id: number;
  botId: number;
  bookingId: number;
  telegramId: number;
  scheduledFor: Date;
  sent: boolean;
  message?: string;
}

// ========== ТАБЛИЦА БОТОВ (Multi-tenant) ==========

export interface Bot {
  // camelCase (TypeScript)
  id: number;
  telegramBotId: string;
  secretPath: string;
  botToken: string;
  botUsername: string;
  ownerId: number;
  ownerName: string;
  isActive: boolean;
  status: 'creating' | 'success' | 'failed';
  createdAt: Date;
  // snake_case (PostgreSQL) - для совместимости
  telegram_bot_id?: string;
  secret_path?: string;
  bot_token?: string;
  bot_username?: string;
  owner_id?: number;
  owner_name?: string;
  is_active?: boolean;
  created_at?: Date;
}

// ========== КЛАСС БД ==========

class PostgresDatabase {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async init(): Promise<void> {
    // Создаём таблицу bots (если ещё не существует)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bots (
        id SERIAL PRIMARY KEY,
        telegram_bot_id VARCHAR(50) NOT NULL UNIQUE,
        secret_path VARCHAR(64) NOT NULL UNIQUE,
        bot_token TEXT NOT NULL,
        bot_username VARCHAR(100) NOT NULL,
        owner_id INTEGER NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'creating',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_bots_secret_path ON bots(secret_path);
      CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON bots(owner_id);
    `);

    // Проверяем существование таблиц и добавляем bot_id если нужно
    await this.addBotIdColumn('services', 'bot_id');
    await this.addBotIdColumn('bookings', 'bot_id');
    await this.addBotIdColumn('schedule', 'bot_id');
    await this.addBotIdColumn('settings', 'bot_id');
    await this.addBotIdColumn('reminders', 'bot_id');

    // Создаём умолчательные таблицы если их нет (для обратной совместимости)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER NOT NULL DEFAULT 1,
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
        bot_id INTEGER NOT NULL DEFAULT 1,
        service_id INTEGER NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        date VARCHAR(10) NOT NULL,
        time VARCHAR(5) NOT NULL,
        duration INTEGER NOT NULL,
        price INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'confirmed',
        cancelled_by VARCHAR(20),
        client_name VARCHAR(255),
        client_phone VARCHAR(20),
        telegram_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS schedule (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER NOT NULL DEFAULT 1,
        day_of_week INTEGER NOT NULL,
        start_time VARCHAR(5) NOT NULL,
        end_time VARCHAR(5) NOT NULL,
        break_start VARCHAR(5),
        break_end VARCHAR(5)
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER NOT NULL DEFAULT 1,
        key VARCHAR(100) NOT NULL,
        value JSONB
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
        bot_id INTEGER NOT NULL DEFAULT 1,
        booking_id INTEGER NOT NULL,
        telegram_id INTEGER NOT NULL,
        scheduled_for TIMESTAMP NOT NULL,
        sent BOOLEAN DEFAULT false,
        message TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_services_bot_id ON services(bot_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_bot_id ON bookings(bot_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
      CREATE INDEX IF NOT EXISTS idx_bookings_telegram_id ON bookings(telegram_id);
      CREATE INDEX IF NOT EXISTS idx_schedule_bot_id ON schedule(bot_id);
      CREATE INDEX IF NOT EXISTS idx_settings_bot_id ON settings(bot_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_bot_id ON reminders(bot_id);
      CREATE INDEX IF NOT EXISTS idx_reminders_scheduled ON reminders(scheduled_for, sent);
    `);

    // Создаём default бота если нет ни одного
    const botsCount = await this.pool.query('SELECT COUNT(*) FROM bots');
    if (parseInt(botsCount.rows[0].count) === 0) {
      // Создаём default бота с ID=1
      await this.createDefaultBot();
    }

    console.log('✅ PostgreSQL database initialized');
  }

  // Добавить колонку bot_id если не существует
  private async addBotIdColumn(tableName: string, columnName: string): Promise<void> {
    try {
      await this.pool.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}') THEN
            ALTER TABLE ${tableName} ADD COLUMN ${columnName} INTEGER NOT NULL DEFAULT 1;
          END IF;
        END $$;
      `);
    } catch (err) {
      console.log(`ℹ️ Table ${tableName} may not exist yet, will be created`);
    }
  }

  // Создать default бота для обратной совместимости
  private async createDefaultBot(): Promise<void> {
    const defaultBotToken = process.env.BOT_TOKEN || '';
    const adminIds = (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    const ownerId = adminIds[0] || 0;
    
    await this.pool.query(
      `INSERT INTO bots (telegram_bot_id, secret_path, bot_token, bot_username, owner_id, owner_name, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, 'success', true)`,
      ['default', 'default', defaultBotToken, 'default_bot', ownerId, 'Default Bot']
    );
    
    // Seed данные для default бота (bot_id = 1)
    await this.seedDefaultData(1);
    
    console.log('📝 Default bot created with ID=1');
  }

  // ========== МЕТОДЫ ДЛЯ РАБОТЫ С БОТАМИ ==========
  
  // Создать нового бота (или обновить, если уже существует)
  async createBot(bot: Omit<Bot, 'id' | 'createdAt'>): Promise<Bot> {
    // Проверяем, существует ли бот с таким telegram_bot_id
    const existing = await this.pool.query('SELECT id FROM bots WHERE telegram_bot_id = $1', [bot.telegramBotId]);
    
    if (existing.rows.length > 0) {
      // Обновляем существующего бота
      const result = await this.pool.query(
        `UPDATE bots SET secret_path = $1, bot_token = $2, bot_username = $3, owner_id = $4, owner_name = $5, status = $6, is_active = $7
         WHERE telegram_bot_id = $8 RETURNING *`,
        [bot.secretPath, bot.botToken, bot.botUsername, bot.ownerId, bot.ownerName, bot.status, bot.isActive, bot.telegramBotId]
      );
      return result.rows[0];
    }
    
    // Создаём нового бота
    const result = await this.pool.query(
      `INSERT INTO bots (telegram_bot_id, secret_path, bot_token, bot_username, owner_id, owner_name, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [bot.telegramBotId, bot.secretPath, bot.botToken, bot.botUsername, bot.ownerId, bot.ownerName, bot.status, bot.isActive]
    );
    return result.rows[0];
  }

  // Получить бота по ID
  async getBotById(id: number): Promise<Bot | undefined> {
    const result = await this.pool.query('SELECT * FROM bots WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Получить бота по secret_path
  async getBotBySecretPath(secretPath: string): Promise<Bot | undefined> {
    const result = await this.pool.query('SELECT * FROM bots WHERE secret_path = $1', [secretPath]);
    return result.rows[0];
  }

  // Получить бота по owner_id
  async getBotByOwnerId(ownerId: number): Promise<Bot | undefined> {
    const result = await this.pool.query('SELECT * FROM bots WHERE owner_id = $1', [ownerId]);
    return result.rows[0];
  }

  // Удалить бота по telegram_bot_id
  async deleteBotByTelegramId(telegramBotId: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM bots WHERE telegram_bot_id = $1', [telegramBotId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Обновить бота
  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.telegramBotId !== undefined) { fields.push(`telegram_bot_id = $${paramIndex++}`); values.push(updates.telegramBotId); }
    if (updates.botToken !== undefined) { fields.push(`bot_token = $${paramIndex++}`); values.push(updates.botToken); }
    if (updates.botUsername !== undefined) { fields.push(`bot_username = $${paramIndex++}`); values.push(updates.botUsername); }
    if (updates.isActive !== undefined) { fields.push(`is_active = $${paramIndex++}`); values.push(updates.isActive); }
    if (updates.status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(updates.status); }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await this.pool.query(
      `UPDATE bots SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  // Seed данные для нового бота
  async seedBotData(botId: number): Promise<void> {
    // Проверяем, есть ли уже данные для этого бота
    const existingServices = await this.pool.query('SELECT COUNT(*) as count FROM services WHERE bot_id = $1', [botId]);
    if (parseInt(existingServices.rows[0].count) > 0) {
      console.log(`📝 Bot data already exists for bot_id=${botId}, skipping seed`);
      return;
    }

    // Услуги
    await this.pool.query(
      `INSERT INTO services (bot_id, name, description, duration, price, sort_order, is_active) VALUES
      ($1, 'Стрижка', 'Стрижка + укладка', 45, 1500, 1, true),
      ($1, 'Стрижка бороды', 'Коррекция бороды', 30, 800, 2, true),
      ($1, 'Комплекс', 'Стрижка + борода', 60, 2000, 3, true),
      ($1, 'Бритьё опасной бритвой', 'Традиционное бритьё', 40, 1200, 4, true)`,
      [botId]
    );

    // Расписание
    await this.pool.query(
      `INSERT INTO schedule (bot_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
      ($1, 1, '10:00', '20:00', '14:00', '15:00'),
      ($1, 2, '10:00', '20:00', '14:00', '15:00'),
      ($1, 3, '10:00', '20:00', '14:00', '15:00'),
      ($1, 4, '10:00', '20:00', '14:00', '15:00'),
      ($1, 5, '10:00', '20:00', '14:00', '15:00'),
      ($1, 6, '10:00', '18:00', NULL, NULL)`,
      [botId]
    );

    // Настройки
    await this.pool.query(
      `INSERT INTO settings (bot_id, key, value) VALUES 
      ($1, 'reminderSettings', '{"enabled": true, "defaultMinutesBefore": 120, "customReminders": []}'),
      ($1, 'bufferTime', '15'::jsonb)`,
      [botId]
    );

    console.log(`📝 Bot data seeded for bot_id=${botId}`);
  }

  private async seedDefaultData(botId: number): Promise<void> {
    // Проверяем, есть ли уже данные для этого бота
    const existingServices = await this.pool.query('SELECT COUNT(*) as count FROM services WHERE bot_id = $1', [botId]);
    if (parseInt(existingServices.rows[0].count) > 0) {
      console.log(`📝 Default bot data already exists for bot_id=${botId}, skipping seed`);
      return;
    }

    await this.pool.query(
      `INSERT INTO services (bot_id, name, description, duration, price, sort_order, is_active) VALUES
      ($1, 'Стрижка', 'Стрижка + укладка', 45, 1500, 1, true),
      ($1, 'Стрижка бороды', 'Коррекция бороды', 30, 800, 2, true),
      ($1, 'Комплекс', 'Стрижка + борода', 60, 2000, 3, true),
      ($1, 'Бритьё опасной бритвой', 'Традиционное бритьё', 40, 1200, 4, true)`,
      [botId]
    );

    await this.pool.query(
      `INSERT INTO schedule (bot_id, day_of_week, start_time, end_time, break_start, break_end) VALUES
      ($1, 1, '10:00', '20:00', '14:00', '15:00'),
      ($1, 2, '10:00', '20:00', '14:00', '15:00'),
      ($1, 3, '10:00', '20:00', '14:00', '15:00'),
      ($1, 4, '10:00', '20:00', '14:00', '15:00'),
      ($1, 5, '10:00', '20:00', '14:00', '15:00'),
      ($1, 6, '10:00', '18:00', NULL, NULL)`,
      [botId]
    );

    await this.pool.query(
      `INSERT INTO settings (bot_id, key, value) VALUES 
      ($1, 'reminderSettings', '{"enabled": true, "defaultMinutesBefore": 120, "customReminders": []}'),
      ($1, 'bufferTime', '15'::jsonb)`,
      [botId]
    );

    console.log(`📝 Default data seeded for bot_id=${botId}`);
  }

  // Services (с bot_id)
  async getServices(botId: number, includeInactive = false): Promise<Service[]> {
    const query = includeInactive 
      ? 'SELECT * FROM services WHERE bot_id = $1 ORDER BY sort_order'
      : 'SELECT * FROM services WHERE bot_id = $1 AND is_active = true ORDER BY sort_order';
    const result = await this.pool.query(query, [botId]);
    return result.rows;
  }

  async getServiceById(botId: number, id: number): Promise<Service | undefined> {
    const result = await this.pool.query('SELECT * FROM services WHERE id = $1 AND bot_id = $2', [id, botId]);
    return result.rows[0];
  }

  async createService(botId: number, service: Omit<Service, 'id' | 'botId'>): Promise<Service> {
    const maxOrder = await this.pool.query('SELECT COALESCE(MAX(sort_order), 0) as max FROM services WHERE bot_id = $1', [botId]);
    const sortOrder = maxOrder.rows[0].max + 1;

    const result = await this.pool.query(
      `INSERT INTO services (bot_id, name, description, duration, price, category, photos, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING *`,
      [botId, service.name, service.description || '', service.duration, service.price, service.category || null, JSON.stringify(service.photos || []), sortOrder]
    );
    return result.rows[0];
  }

  async updateService(botId: number, id: number, updates: Partial<Service>): Promise<Service | null> {
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

    if (fields.length === 0) {
      const service = await this.getServiceById(botId, id);
      return service || null;
    }

    values.push(botId, id);
    const result = await this.pool.query(
      `UPDATE services SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND bot_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async deleteService(botId: number, id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM services WHERE id = $1 AND bot_id = $2', [id, botId]);
    return (result.rowCount ?? 0) > 0;
  }

  async reorderServices(botId: number, orderedIds: number[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.pool.query('UPDATE services SET sort_order = $1 WHERE id = $2 AND bot_id = $3', [i + 1, orderedIds[i], botId]);
    }
  }

  // Bookings (с bot_id)
  async getBookings(botId: number): Promise<Booking[]> {
    const result = await this.pool.query('SELECT * FROM bookings WHERE bot_id = $1 ORDER BY date, time', [botId]);
    return result.rows;
  }

  async getBookingsByDate(botId: number, date: string): Promise<Booking[]> {
    const result = await this.pool.query('SELECT * FROM bookings WHERE bot_id = $1 AND date = $2', [botId, date]);
    return result.rows;
  }

  // Создание брони с транзакцией и защитой от double booking
  async createBooking(botId: number, booking: Omit<Booking, 'id' | 'botId' | 'createdAt' | 'status'>): Promise<Booking> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Проверяем доступность слота с блокировкой
      const existingBooking = await client.query(
        `SELECT id FROM bookings 
         WHERE bot_id = $1 AND date = $2 AND time = $3 AND status = 'confirmed'
         FOR UPDATE`,
        [botId, booking.date, booking.time]
      );
      
      if (existingBooking.rows.length > 0) {
        await client.query('ROLLBACK');
        throw new Error('Time slot is already booked');
      }
      
      // Создаём бронь
      const result = await client.query(
        `INSERT INTO bookings (bot_id, service_id, service_name, date, time, duration, price, status, client_name, client_phone, telegram_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9, $10) RETURNING *`,
        [botId, booking.serviceId, booking.serviceName, booking.date, booking.time, booking.duration, booking.price, booking.clientName || null, booking.clientPhone || null, booking.telegramId || null]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateBookingStatus(botId: number, id: number, status: 'confirmed' | 'cancelled' | 'cancelled_by_user' | 'cancelled_by_admin' | 'completed' | 'no_show'): Promise<Booking | null> {
    let cancelledBy: string | undefined;
    if (status === 'cancelled_by_user') {
      cancelledBy = 'user';
    } else if (status === 'cancelled_by_admin') {
      cancelledBy = 'admin';
    }
    
    const result = await this.pool.query(
      'UPDATE bookings SET status = $1, cancelled_by = $2 WHERE id = $3 AND bot_id = $4 RETURNING *',
      [status, cancelledBy || null, id, botId]
    );
    return result.rows[0] || null;
  }

  async updateBooking(botId: number, id: number, updates: Partial<Pick<Booking, 'date' | 'time'>>): Promise<Booking | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.date !== undefined) { fields.push(`date = $${paramIndex++}`); values.push(updates.date); }
    if (updates.time !== undefined) { fields.push(`time = $${paramIndex++}`); values.push(updates.time); }

    if (fields.length === 0) return null;

    values.push(id, botId);
    const result = await this.pool.query(
      `UPDATE bookings SET ${fields.join(', ')} WHERE id = $${paramIndex++} AND bot_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async getAllBookings(botId: number, filters: { date?: string; status?: string; startDate?: string; endDate?: string } = {}): Promise<Booking[]> {
    let query = 'SELECT * FROM bookings WHERE bot_id = $1';
    const params: any[] = [botId];
    let paramIndex = 2;

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

  async getBookedDates(botId: number, startDate: string, endDate: string): Promise<Record<string, number>> {
    const result = await this.pool.query(
      `SELECT date, COUNT(*) as count FROM bookings 
       WHERE bot_id = $1 AND status = 'confirmed' AND date >= $2 AND date <= $3 
       GROUP BY date`,
      [botId, startDate, endDate]
    );
    const counts: Record<string, number> = {};
    result.rows.forEach(row => { counts[row.date] = parseInt(row.count); });
    return counts;
  }

  async deleteBooking(botId: number, id: number): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM bookings WHERE id = $1 AND bot_id = $2', [id, botId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Schedule (с bot_id)
  async getSchedule(botId: number): Promise<Schedule[]> {
    const result = await this.pool.query('SELECT * FROM schedule WHERE bot_id = $1 ORDER BY day_of_week', [botId]);
    return result.rows;
  }

  async getBufferTime(botId: number): Promise<number> {
    const result = await this.pool.query("SELECT value FROM settings WHERE bot_id = $1 AND key = 'bufferTime'", [botId]);
    if (result.rows.length === 0) return 15;
    return typeof result.rows[0].value === 'number' ? result.rows[0].value : 15;
  }

  async getAvailableSlots(botId: number, date: string, serviceDuration: number): Promise<string[]> {
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();
    const daySchedule = await this.pool.query(
      'SELECT * FROM schedule WHERE bot_id = $1 AND day_of_week = $2',
      [botId, dayOfWeek]
    );

    if (daySchedule.rows.length === 0) return [];

    const schedule = daySchedule.rows[0];
    
    // Получаем только подтверждённые брони
    const result = await this.pool.query(
      "SELECT * FROM bookings WHERE bot_id = $1 AND date = $2 AND status = 'confirmed'",
      [botId, date]
    );
    const bookings = result.rows;
    
    const bufferTime = await this.getBufferTime(botId);

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

  // User bookings (с bot_id)
  async getUserUpcomingBookings(botId: number, telegramId: number): Promise<Booking[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.pool.query(
      `SELECT * FROM bookings WHERE bot_id = $1 AND telegram_id = $2 AND date >= $3 AND status = 'confirmed' ORDER BY date, time`,
      [botId, telegramId, today]
    );
    return result.rows;
  }

  async getUserPastBookings(botId: number, telegramId: number): Promise<Booking[]> {
    const today = new Date().toISOString().split('T')[0];
    const result = await this.pool.query(
      `SELECT * FROM bookings WHERE bot_id = $1 AND telegram_id = $2 AND (date < $3 OR status != 'confirmed') ORDER BY date DESC, time DESC`,
      [botId, telegramId, today]
    );
    return result.rows;
  }

  // Settings (с bot_id)
  async getReminderSettings(botId: number): Promise<ReminderSettings> {
    const result = await this.pool.query("SELECT value FROM settings WHERE bot_id = $1 AND key = 'reminderSettings'", [botId]);
    if (result.rows.length === 0) {
      return { enabled: true, defaultMinutesBefore: 120, customReminders: [] };
    }
    return result.rows[0].value;
  }

  async updateReminderSettings(botId: number, updates: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const current = await this.getReminderSettings(botId);
    const updated = { ...current, ...updates };
    
    await this.pool.query(
      "INSERT INTO settings (bot_id, key, value) VALUES ($1, 'reminderSettings', $2) ON CONFLICT (bot_id, key) DO UPDATE SET value = $2",
      [botId, JSON.stringify(updated)]
    );
    
    return updated;
  }

  // Reminders (с bot_id)
  async createReminder(botId: number, bookingId: number, telegramId: number, scheduledFor: string, message?: string): Promise<ScheduledReminder> {
    const result = await this.pool.query(
      'INSERT INTO reminders (bot_id, booking_id, telegram_id, scheduled_for, message) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [botId, bookingId, telegramId, scheduledFor, message || null]
    );
    return result.rows[0];
  }

  async getPendingReminders(botId: number): Promise<ScheduledReminder[]> {
    const result = await this.pool.query(
      "SELECT * FROM reminders WHERE bot_id = $1 AND sent = false AND scheduled_for <= NOW()",
      [botId]
    );
    return result.rows;
  }

  async markReminderSent(botId: number, id: number): Promise<void> {
    await this.pool.query('UPDATE reminders SET sent = true WHERE id = $1 AND bot_id = $2', [id, botId]);
  }

  async deleteRemindersByBookingId(botId: number, bookingId: number): Promise<void> {
    await this.pool.query('DELETE FROM reminders WHERE booking_id = $1 AND bot_id = $2', [bookingId, botId]);
  }
}

export const db = new PostgresDatabase();
