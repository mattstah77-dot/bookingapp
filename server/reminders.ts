import { Bot } from 'grammy';
import { db } from './database.js';

// Интервал проверки напоминаний (в миллисекундах)
const REMINDER_CHECK_INTERVAL = 60 * 1000; // 1 минута

// Формат даты для напоминания
function formatBookingDateTime(dateStr: string, timeStr: string): string {
  const date = new Date(dateStr + 'T' + timeStr + ':00');
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }) + ' в ' + timeStr;
}

// Создать текст напоминания для пользователя
function createReminderMessage(booking: any): string {
  return `⏰ Напоминание о записи!

✂️ Услуга: ${booking.serviceName}
📅 Дата: ${formatBookingDateTime(booking.date, booking.time)}
💰 Цена: ${booking.price} ₽

Ждём вас!`;
}

// Создать текст уведомления для админа о новой записи
function createAdminNotification(booking: any): string {
  return `🔔 Новая запись!

✂️ Услуга: ${booking.serviceName}
📅 Дата: ${formatBookingDateTime(booking.date, booking.time)}
🕐 Длительность: ${booking.duration} мин
💰 Цена: ${booking.price} ₽
👤 Клиент: ${booking.clientName || '—'}
📱 Телефон: ${booking.clientPhone || '—'}`;
}

// Планирование напоминаний при создании брони
export async function scheduleRemindersForBooking(booking: any): Promise<void> {
  const settings = await db.getReminderSettings();
  
  if (!settings.enabled || !booking.telegramId) {
    return;
  }

  // Вычисляем время записи
  const bookingDateTime = new Date(booking.date + 'T' + booking.time + ':00');
  
  // Проверяем, есть ли настройка для конкретной услуги
  const customReminder = settings.customReminders.find(
    (r: any) => r.serviceId === booking.serviceId
  );
  
  const minutesBefore = customReminder?.minutesBefore || settings.defaultMinutesBefore;
  
  // Вычисляем время для напоминания
  const reminderTime = new Date(bookingDateTime.getTime() - minutesBefore * 60 * 1000);
  
  // Если время напоминания ещё не прошло - планируем
  if (reminderTime > new Date()) {
    await db.createReminder(
      booking.id,
      booking.telegramId,
      reminderTime.toISOString(),
      createReminderMessage(booking)
    );
    console.log(`📅 Reminder scheduled for booking ${booking.id} at ${reminderTime.toISOString()}`);
  }
}

// Отправка запланированных напоминаний
export async function processPendingReminders(bot: Bot | null): Promise<void> {
  if (!bot) return;
  
  try {
    const pendingReminders = await db.getPendingReminders();
    
    for (const reminder of pendingReminders) {
      try {
        await bot.api.sendMessage(
          reminder.telegramId,
          reminder.message || '⏰ Напоминание о вашей записи!'
        );
        
        await db.markReminderSent(reminder.id);
        console.log(`✅ Reminder sent for booking ${reminder.bookingId}`);
      } catch (err) {
        console.error(`❌ Failed to send reminder ${reminder.id}:`, err);
      }
    }
  } catch (err) {
    console.error('❌ Error processing reminders:', err);
  }
}

// Уведомление админа о новой записи
export async function notifyAdminOfNewBooking(bot: Bot | null, booking: any, adminIds: number[]): Promise<void> {
  if (!bot || adminIds.length === 0) return;
  
  const message = createAdminNotification(booking);
  
  for (const adminId of adminIds) {
    try {
      await bot.api.sendMessage(adminId, message);
      console.log(`✅ Admin notification sent to ${adminId}`);
    } catch (err) {
      console.error(`❌ Failed to notify admin ${adminId}:`, err);
    }
  }
}

// Запуск планировщика напоминаний
export function startReminderScheduler(bot: Bot | null): void {
  console.log('⏰ Starting reminder scheduler...');
  
  setInterval(() => {
    processPendingReminders(bot);
  }, REMINDER_CHECK_INTERVAL);
  
  // Первая проверка через 10 секунд после запуска
  setTimeout(() => {
    processPendingReminders(bot);
  }, 10000);
}
