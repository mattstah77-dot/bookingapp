/**
 * Конфигурация рабочего времени
 */
export interface ScheduleConfig {
  startTime: string;  // "09:00"
  endTime: string;    // "19:00"
  interval: number;   // интервал в минутах (30, 60 и т.д.)
  buffer: number;     // буфер между клиентами в минутах
}

/**
 * Выходные данные слота
 */
export interface TimeSlot {
  time: string;       // "10:00"
  endTime: string;    // "10:30" (время окончания с учётом длительности)
  available: boolean;
}

/**
 * Дефолтная конфигурация
 */
export const DEFAULT_SCHEDULE: ScheduleConfig = {
  startTime: '09:00',
  endTime: '19:00',
  interval: 30,
  buffer: 10, // 10 минут буфер между клиентами
};

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
 * Проверяет, помещается ли услуга в рабочий день
 */
function fitsInWorkDay(
  slotStart: number,
  serviceDuration: number,
  buffer: number,
  workEnd: number
): boolean {
  const slotEnd = slotStart + serviceDuration + buffer;
  return slotEnd <= workEnd;
}

/**
 * Генерирует массив временных слотов
 * 
 * @param config - конфигурация расписания
 * @param serviceDuration - длительность услуги в минутах
 * @param bookedSlots - массив занятых слотов (опционально)
 * @returns массив доступных слотов
 */
export function generateTimeSlots(
  config: ScheduleConfig = DEFAULT_SCHEDULE,
  serviceDuration: number = 60,
  bookedSlots: string[] = []
): TimeSlot[] {
  const { startTime, endTime, interval, buffer } = config;
  
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  // Множество занятых слотов для быстрого поиска
  const bookedSet = new Set(bookedSlots);
  
  const slots: TimeSlot[] = [];
  
  // Генерируем слоты с учётом интервала
  for (let time = startMinutes; time < endMinutes; time += interval) {
    // Проверяем, помещается ли услуга в рабочий день
    if (!fitsInWorkDay(time, serviceDuration, buffer, endMinutes)) {
      continue;
    }
    
    const slotTime = minutesToTime(time);
    const slotEndTime = minutesToTime(time + serviceDuration);
    const isBooked = bookedSet.has(slotTime);
    
    slots.push({
      time: slotTime,
      endTime: slotEndTime,
      available: !isBooked,
    });
  }
  
  return slots;
}

/**
 * Проверяет, является ли слот прошедшим
 * @param slotTime - время слота "HH:MM"
 * @param date - дата слота
 */
export function isSlotPast(slotTime: string, date: Date): boolean {
  const now = new Date();
  
  // Проверяем, та же ли это дата
  const isToday = date.toDateString() === now.toDateString();
  
  if (!isToday) {
    return false; // Будущие даты - не прошедшие
  }
  
  const [slotHours, slotMinutes] = slotTime.split(':').map(Number);
  const slotDate = new Date(now);
  slotDate.setHours(slotHours, slotMinutes, 0, 0);
  
  // Слот прошедший если его время меньше текущего + небольшой буфер (5 минут)
  const bufferTime = 5 * 60 * 1000; // 5 минут
  return slotDate.getTime() < (now.getTime() - bufferTime);
}

/**
 * Фильтрует прошедшие слоты
 */
export function filterPastSlots(slots: TimeSlot[], date: Date): TimeSlot[] {
  return slots.filter(slot => !isSlotPast(slot.time, date));
}

/**
 * Получает только доступные слоты (не прошедшие и не занятые)
 */
export function getAvailableSlots(slots: TimeSlot[], date: Date): TimeSlot[] {
  return filterPastSlots(slots, date).filter(slot => slot.available);
}

/**
 * Форматирует слоты для отображения (только время)
 */
export function formatSlotsForDisplay(slots: TimeSlot[]): string[] {
  return slots.map(slot => slot.time);
}
