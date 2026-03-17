/**
 * Smart Dynamic Slot Engine
 * Полноценная система генерации временных слотов
 */

// ========== ТИПЫ ==========

/**
 * Конфигурация рабочего времени
 */
export interface ScheduleConfig {
  workDayStart: string;   // "09:00" - начало рабочего дня
  workDayEnd: string;     // "19:00" - конец рабочего дня
  slotStep: number;       // 15 - шаг сетки в минутах
  bufferBetweenClients: number; // 10 - буфер между клиентами
  breakStart?: string;    // "14:00" - начало перерыва
  breakEnd?: string;      // "15:00" - конец перерыва
}

/**
 * Существующая бронь (интервал)
 */
export interface Booking {
  start: string;  // "10:00"
  end: string;    // "11:00"
}

/**
 * Выходные данные слота
 */
export interface TimeSlot {
  time: string;       // "10:00" - старт слота
  endTime: string;    // "11:10" - время окончания с учётом длительности + буфер
  slotsCount: number; // сколько слотов сетки занимает услуга
  available: boolean;
}

/**
 * Параметры генерации слотов
 */
export interface GenerateSlotsParams {
  config: ScheduleConfig;
  serviceDuration: number;  // длительность услуги в минутах
  bookings: Booking[];      // существующие брони
  selectedDate: Date;       // выбранная дата
}

/**
 * Дефолтная конфигурация (должна совпадать с бэкендом)
 */
export const DEFAULT_SCHEDULE: ScheduleConfig = {
  workDayStart: '10:00',
  workDayEnd: '20:00',
  slotStep: 15,           // 15 минут шаг сетки
  bufferBetweenClients: 15, // 15 минут буфер (как в database.ts)
  breakStart: '14:00',    // обед
  breakEnd: '15:00',
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

/**
 * Парсит время "HH:MM" в минуты от начала дня
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Конвертирует минуты в формат "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * ЭТАП 1 — СОЗДАНИЕ ВРЕМЕННОЙ СЕТКИ
 * Генерирует базовые точки начала записи
 */
function createTimeGrid(startMinutes: number, endMinutes: number, step: number): number[] {
  const grid: number[] = [];
  for (let time = startMinutes; time < endMinutes; time += step) {
    grid.push(time);
  }
  return grid;
}

/**
 * ЭТАП 3 — ПРОВЕРКА КОНЦА РАБОЧЕГО ДНЯ
 * Проверяет, помещается ли услуга в рабочий день
 */
function fitsInWorkDay(
  slotStart: number,
  serviceDuration: number,
  buffer: number,
  workEnd: number
): boolean {
  const totalDuration = serviceDuration + buffer;
  const slotEnd = slotStart + totalDuration;
  return slotEnd <= workEnd;
}

/**
 * ЭТАП 5 & 7 — ПРОВЕРКА ПЕРЕСЕЧЕНИЙ
 * Проверяет, пересекается ли слот с существующими бронями
 */
function hasIntersection(
  slotStart: number,
  serviceDuration: number,
  buffer: number,
  bookings: Booking[]
): boolean {
  const slotEnd = slotStart + serviceDuration + buffer;
  
  for (const booking of bookings) {
    const bookingStart = parseTimeToMinutes(booking.start);
    const bookingEnd = parseTimeToMinutes(booking.end);
    
    // Слот пересекается если: slotStart < bookingEnd AND slotEnd > bookingStart
    if (slotStart < bookingEnd && slotEnd > bookingStart) {
      return true;
    }
  }
  
  return false;
}

/**
 * ЭТАП 8 — ПРОВЕРКА ПЕРЕРЫВА
 * Проверяет, пересекается ли слот с обеденным перерывом
 */
function isDuringBreak(
  slotStart: number,
  serviceDuration: number,
  breakStart?: string,
  breakEnd?: string
): boolean {
  if (!breakStart || !breakEnd) return false;
  
  const breakStartMins = parseTimeToMinutes(breakStart);
  const breakEndMins = parseTimeToMinutes(breakEnd);
  const slotEnd = slotStart + serviceDuration;
  
  // Слот пересекается с перерывом если: slotStart < breakEnd AND slotEnd > breakStart
  return slotStart < breakEndMins && slotEnd > breakStartMins;
}

/**
 * ЭТАП 6 — ФИЛЬТРАЦИЯ ПРОШЕДШЕГО ВРЕМЕНИ
 * Проверяет, является ли слот прошедшим
 */
function isSlotPast(slotTime: string, selectedDate: Date): boolean {
  const now = new Date();
  
  // Проверяем, та же ли это дата
  const isToday = selectedDate.toDateString() === now.toDateString();
  
  if (!isToday) {
    return false;
  }
  
  const [slotHours, slotMinutes] = slotTime.split(':').map(Number);
  const slotDate = new Date(now);
  slotDate.setHours(slotHours, slotMinutes, 0, 0);
  
  // Слот прошедший если его время меньше текущего + 5 минут буфер
  const bufferTime = 5 * 60 * 1000;
  return slotDate.getTime() < (now.getTime() - bufferTime);
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ГЕНЕРАЦИИ ==========

/**
 * Генерирует доступные временные слоты
 * Работает в 5 этапов согласно спецификации
 */
export function generateTimeSlots(params: GenerateSlotsParams): TimeSlot[] {
  const { config, serviceDuration, bookings, selectedDate } = params;
  const { workDayStart, workDayEnd, slotStep, bufferBetweenClients, breakStart, breakEnd } = config;
  
  // ЭТАП 1: Создание временной сетки
  const startMinutes = parseTimeToMinutes(workDayStart);
  const endMinutes = parseTimeToMinutes(workDayEnd);
  const timeGrid = createTimeGrid(startMinutes, endMinutes, slotStep);
  
  // ЭТАП 2: Расчёт полного времени записи (услуга + буфер)
  const totalDuration = serviceDuration + bufferBetweenClients;
  
  const slots: TimeSlot[] = [];
  
  for (const slotStart of timeGrid) {
    // ЭТАП 3: Проверка конца рабочего дня
    if (!fitsInWorkDay(slotStart, serviceDuration, bufferBetweenClients, endMinutes)) {
      continue;
    }
    
    // ЭТАП 7: Проверка пересечений с существующими бронями
    if (hasIntersection(slotStart, serviceDuration, bufferBetweenClients, bookings)) {
      continue;
    }
    
    // ЭТАП 8: Проверка обеденного перерыва
    if (isDuringBreak(slotStart, serviceDuration, breakStart, breakEnd)) {
      continue;
    }
    
    // ЭТАП 6: Фильтрация прошедшего времени
    const slotTime = minutesToTime(slotStart);
    if (isSlotPast(slotTime, selectedDate)) {
      continue;
    }
    
    // ЭТАП 4: Расчёт сколько слотов сетки занимает услуга
    const slotsCount = Math.ceil(totalDuration / slotStep);
    
    // Время окончания (только услуга, без буфера - буфер невидим для клиента)
    const endTime = minutesToTime(slotStart + serviceDuration);
    
    slots.push({
      time: slotTime,
      endTime: endTime,
      slotsCount,
      available: true,
    });
  }
  
  return slots;
}

/**
 * Упрощённая функция для совместимости
 */
export function generateSimpleTimeSlots(
  config: ScheduleConfig = DEFAULT_SCHEDULE,
  serviceDuration: number = 60,
  bookedSlots: string[] = []
): TimeSlot[] {
  // Конвертируем старый формат занятых слотов в новый
  const bookings: Booking[] = bookedSlots.map(time => ({
    start: time,
    end: minutesToTime(parseTimeToMinutes(time) + serviceDuration),
  }));
  
  return generateTimeSlots({
    config,
    serviceDuration,
    bookings,
    selectedDate: new Date(),
  });
}

/**
 * Форматирует слоты для отображения
 */
export function formatSlotsForDisplay(slots: TimeSlot[]): string[] {
  return slots.map(slot => slot.time);
}
