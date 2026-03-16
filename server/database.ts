import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number; // минуты
  price: number;
  category?: string;
}

export interface Booking {
  id: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled';
  clientName?: string;
  clientPhone?: string;
  telegramId?: number;
  createdAt: string;
}

export interface BookingFilters {
  date?: string;
  status?: 'confirmed' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

export interface Schedule {
  dayOfWeek: number; // 0 = воскресенье, 1 = понедельник
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  breakStart?: string;
  breakEnd?: string;
}

export interface Database {
  services: Service[];
  bookings: Booking[];
  schedule: Schedule[];
  bufferTime: number; // минуты между записями
}

const DEFAULT_DB: Database = {
  services: [
    { id: '1', name: 'Стрижка', description: 'Стрижка + укладка', duration: 45, price: 1500 },
    { id: '2', name: 'Стрижка бороды', description: 'Коррекция бороды', duration: 30, price: 800 },
    { id: '3', name: 'Комплекс', description: 'Стрижка + борода', duration: 60, price: 2000 },
    { id: '4', name: 'Бритьё опасной бритвой', description: 'Традиционное бритьё', duration: 40, price: 1200 },
  ],
  bookings: [],
  schedule: [
    { dayOfWeek: 1, startTime: '10:00', endTime: '20:00', breakStart: '14:00', breakEnd: '15:00' }, // Пн
    { dayOfWeek: 2, startTime: '10:00', endTime: '20:00', breakStart: '14:00', breakEnd: '15:00' }, // Вт
    { dayOfWeek: 3, startTime: '10:00', endTime: '20:00', breakStart: '14:00', breakEnd: '15:00' }, // Ср
    { dayOfWeek: 4, startTime: '10:00', endTime: '20:00', breakStart: '14:00', breakEnd: '15:00' }, // Чт
    { dayOfWeek: 5, startTime: '10:00', endTime: '20:00', breakStart: '14:00', breakEnd: '15:00' }, // Пт
    { dayOfWeek: 6, startTime: '10:00', endTime: '18:00' }, // Сб
    // Воскресенье - выходной
  ],
  bufferTime: 15, // 15 минут буфер между записями
};

class AsyncDatabase {
  private db: Database;
  private dbPath: string;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data', 'database.json');
    this.db = { ...DEFAULT_DB };
  }

  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.dbPath, 'utf-8');
      const loaded = JSON.parse(data);
      this.db = { ...DEFAULT_DB, ...loaded };
      console.log('✅ Database loaded from file');
    } catch {
      console.log('📝 Using default database');
      await this.save();
    }
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.dbPath, JSON.stringify(this.db, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.save(), 1000);
  }

  // Services
  async getServices(): Promise<Service[]> {
    return [...this.db.services];
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    return this.db.services.find(s => s.id === id);
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    return [...this.db.bookings];
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    return this.db.bookings.filter(b => b.date === date);
  }

  async createBooking(booking: Omit<Booking, 'id' | 'createdAt' | 'status'>): Promise<Booking> {
    const newBooking: Booking = {
      ...booking,
      id: crypto.randomUUID(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
    this.db.bookings.push(newBooking);
    this.scheduleSave();
    return newBooking;
  }

  async updateBookingStatus(id: string, status: 'confirmed' | 'cancelled'): Promise<Booking | null> {
    const booking = this.db.bookings.find(b => b.id === id);
    if (booking) {
      booking.status = status;
      this.scheduleSave();
      return booking;
    }
    return null;
  }

  async getAllBookings(filters: BookingFilters = {}): Promise<Booking[]> {
    let bookings = [...this.db.bookings];
    
    if (filters.date) {
      bookings = bookings.filter(b => b.date === filters.date);
    }
    
    if (filters.status) {
      bookings = bookings.filter(b => b.status === filters.status);
    }
    
    if (filters.startDate && filters.endDate) {
      bookings = bookings.filter(b => b.date >= filters.startDate! && b.date <= filters.endDate!);
    }
    
    bookings.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    
    return bookings;
  }

  async getBookedDates(startDate: string, endDate: string): Promise<Record<string, number>> {
    const bookings = this.db.bookings.filter(b => 
      b.status === 'confirmed' && 
      b.date >= startDate && 
      b.date <= endDate
    );
    
    const dateCounts: Record<string, number> = {};
    bookings.forEach(b => {
      dateCounts[b.date] = (dateCounts[b.date] || 0) + 1;
    });
    
    return dateCounts;
  }

  async deleteBooking(id: string): Promise<boolean> {
    const index = this.db.bookings.findIndex(b => b.id === id);
    if (index !== -1) {
      this.db.bookings.splice(index, 1);
      this.scheduleSave();
      return true;
    }
    return false;
  }

  // Schedule
  async getSchedule(): Promise<Schedule[]> {
    return [...this.db.schedule];
  }

  async getBufferTime(): Promise<number> {
    return this.db.bufferTime;
  }

  // Smart slot generation
  async getAvailableSlots(date: string, serviceDuration: number): Promise<string[]> {
    const dayOfWeek = new Date(date).getDay();
    const daySchedule = this.db.schedule.find(s => s.dayOfWeek === dayOfWeek);

    if (!daySchedule) {
      return []; // Выходной день
    }

    const bookings = await this.getBookingsByDate(date);
    const bufferTime = this.db.bufferTime;

    const slots: string[] = [];
    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    // Услуга должна закончиться до конца рабочего дня (буфер - после)
    const serviceEndLimit = endTime - serviceDuration;

    while (currentTime <= serviceEndLimit) {
      const hours = Math.floor(currentTime / 60);
      const minutes = currentTime % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      // Проверяем перерыв
      let isBreak = false;
      if (daySchedule.breakStart && daySchedule.breakEnd) {
        const [breakStartH, breakStartM] = daySchedule.breakStart.split(':').map(Number);
        const [breakEndH, breakEndM] = daySchedule.breakEnd.split(':').map(Number);
        const breakStart = breakStartH * 60 + breakStartM;
        const breakEnd = breakEndH * 60 + breakEndM;

        // Проверяем перекрытие с перерывом
        if (currentTime < breakEnd && (currentTime + serviceDuration) > breakStart) {
          isBreak = true;
        }
      }

      if (!isBreak) {
        // Проверяем занятые слоты (с учётом буфера)
        const isAvailable = !bookings.some(booking => {
          const [bookH, bookM] = booking.time.split(':').map(Number);
          const bookStart = bookH * 60 + bookM;
          // Конец с учётом длительности + буфер
          const bookEnd = bookStart + booking.duration + bufferTime;

          // Проверяем перекрытие временных интервалов
          return (currentTime < bookEnd && (currentTime + serviceDuration + bufferTime) > bookStart);
        });

        if (isAvailable) {
          slots.push(timeStr);
        }
      }

      currentTime += 15; // Шаг 15 минут
    }

    return slots;
  }
}

export const db = new AsyncDatabase();
