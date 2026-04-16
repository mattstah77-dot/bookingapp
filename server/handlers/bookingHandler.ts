// Обработчик для booking-ботов
import { db } from '../database.js';
import type { BotHandler, BotContext, TelegramUpdateContext } from './types.js';

export class BookingHandler implements BotHandler {
  // Метаданные типа бота (продуктовый слой)
  meta = {
    type: 'booking',
    name: 'Бот записи',
    description: 'Позволяет клиентам записываться на услуги',
    category: 'business',
    features: [
      'Онлайн запись',
      'Управление услугами',
      'Просмотр записей'
    ],
    isActive: true,
    isPublic: true,
    price: 10,
  };
  
  async getClientData(ctx: BotContext): Promise<any> {
    const services = await db.getServices(ctx.botId, false);
    const schedule = await db.getSchedule(ctx.botId);
    
    return {
      type: 'booking_form',
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        duration: s.duration,
        price: s.price,
      })),
      schedule,
    };
  }

  async handleAction(ctx: BotContext, action: string, payload: any): Promise<any> {
    switch (action) {
      // === КЛИЕНТСКИЕ ACTIONS ===
      case 'create_booking': {
        const { serviceId, serviceName, date, time, duration, price, clientName, clientPhone } = payload;
        
        const booking = await db.createBooking(ctx.botId, {
          serviceId,
          serviceName,
          date,
          time,
          duration,
          price,
          clientName,
          clientPhone,
          telegramId: ctx.telegramId,
        });
        
        return { bookingId: booking.id, message: 'Запись создана' };
      }
      
      case 'cancel_booking': {
        const { bookingId } = payload;
        await db.updateBookingStatus(ctx.botId, bookingId, 'cancelled_by_user');
        await db.deleteRemindersByBookingId(ctx.botId, bookingId);
        return { success: true, message: 'Запись отменена' };
      }
      
      case 'get_my_bookings': {
        if (!ctx.telegramId) {
          return { upcoming: [], past: [] };
        }
        const upcoming = await db.getUserUpcomingBookings(ctx.botId, ctx.telegramId);
        const past = await db.getUserPastBookings(ctx.botId, ctx.telegramId);
        return { upcoming, past };
      }
      
      case 'get_slots': {
        const { date, duration } = payload;
        const slots = await db.getAvailableSlots(ctx.botId, date, duration);
        return { slots };
      }
      
      // === АДМИНСКИЕ ACTIONS ===
      case 'get_bookings': {
        const { date, status, startDate, endDate } = payload || {};
        const filters: any = {};
        if (date) filters.date = date;
        if (status) filters.status = status;
        if (startDate && endDate) {
          filters.startDate = startDate;
          filters.endDate = endDate;
        }
        const bookings = await db.getAllBookings(ctx.botId, filters);
        return { bookings };
      }
      
      case 'update_booking_status': {
        const { bookingId, status } = payload;
        
        if (!bookingId || !status) {
          throw new Error('bookingId и status обязательны');
        }
        
        const validStatuses = ['confirmed', 'cancelled', 'cancelled_by_admin', 'completed', 'no_show'];
        if (!validStatuses.includes(status)) {
          throw new Error('Неверный статус');
        }
        
        await db.updateBookingStatus(ctx.botId, bookingId, status);
        return { success: true };
      }
      
      case 'get_services': {
        const { includeInactive } = payload || false;
        const services = await db.getServices(ctx.botId, includeInactive);
        return { services };
      }
      
      case 'update_service': {
        const { serviceId, ...updates } = payload;
        if (!serviceId) throw new Error('serviceId обязателен');
        const service = await db.updateService(ctx.botId, serviceId, updates);
        return { service };
      }
      
      case 'create_service': {
        const { name, description, duration, price, category, photos } = payload;
        if (!name || !duration || !price) {
          throw new Error('name, duration и price обязательны');
        }
        const service = await db.createService(ctx.botId, {
          name,
          description: description || '',
          duration,
          price,
          category,
          photos: photos || [],
          sortOrder: 0,
          isActive: true,
        });
        return { service };
      }
      
      case 'delete_service': {
        const { serviceId } = payload;
        if (!serviceId) throw new Error('serviceId обязателен');
        await db.deleteService(ctx.botId, serviceId);
        return { success: true };
      }
      
      case 'update_reminder_settings': {
        const { enabled, defaultMinutesBefore, customReminders } = payload;
        const settings = await db.updateReminderSettings(ctx.botId, {
          ...(enabled !== undefined && { enabled }),
          ...(defaultMinutesBefore !== undefined && { defaultMinutesBefore }),
          ...(customReminders !== undefined && { customReminders }),
        });
        return { settings };
      }
      
      case 'set_booking_limit': {
        const { maxActiveBookings } = payload;
        if (typeof maxActiveBookings !== 'number' || maxActiveBookings < 1) {
          throw new Error('maxActiveBookings должно быть числом >= 1');
        }
        await db.setMaxActiveBookings(ctx.botId, maxActiveBookings);
        return { success: true };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async getStats(ctx: BotContext): Promise<any> {
    const bookings = await db.getAllBookings(ctx.botId);
    const today = new Date().toISOString().split('T')[0];
    
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status !== 'confirmed').length;
    const upcoming = bookings.filter(b => b.date >= today && b.status === 'confirmed').length;
    
    // Выручка за текущий месяц
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthBookings = bookings.filter(b => b.date >= monthStart && b.status === 'confirmed');
    const revenue = monthBookings.reduce((sum, b) => sum + (b.price || 0), 0);
    
    return {
      total: bookings.length,
      confirmed,
      cancelled,
      upcoming,
      revenue,
    };
  }

  async getAdminData(ctx: BotContext): Promise<any> {
    const bookings = await db.getAllBookings(ctx.botId);
    const services = await db.getServices(ctx.botId, true);
    const reminderSettings = await db.getReminderSettings(ctx.botId);
    const maxActiveBookings = await db.getMaxActiveBookings(ctx.botId);
    
    return {
      bookings,
      services,
      reminderSettings,
      maxActiveBookings,
    };
  }

  // ========== TELEGRAM UPDATE HANDLER ==========
  
  async handleTelegramUpdate(ctx: TelegramUpdateContext): Promise<boolean> {
    const { update, bot, botId, serverUrl } = ctx;
    const message = update.message;
    const callbackQuery = update.callback_query;
    const text = message?.text;
    const telegramId = message?.from?.id || callbackQuery?.from?.id;
    
    // Обработка /start
    if (text === '/start') {
      await bot.api.sendMessage(
        telegramId,
        'Привет! Я бот для бронирования услуг. 👋\n\nВыберите действие:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}?bot_id=${botId}` } }],
              [{ text: '📋 Мои записи', web_app: { url: `${serverUrl}/my-bookings?bot_id=${botId}` } }]
            ]
          }
        }
      );
      return true; // Обработано
    }
    
    // Обработка callback_query
    if (callbackQuery) {
      const callbackData = callbackQuery.data;
      if (!callbackData) return false;
      
      // Отвечаем на callback чтобы убрать часики
      await bot.api.answerCallbackQuery(callbackQuery.id);
      
      if (callbackData === 'my_bookings_menu') {
        const upcoming = await db.getUserUpcomingBookings(botId, telegramId);
        const past = await db.getUserPastBookings(botId, telegramId);
        
        if (upcoming.length === 0 && past.length === 0) {
          await bot.api.editMessageText(
            telegramId,
            callbackQuery.message?.message_id,
            'У вас пока нет записей.\n\n✂️ Нажмите "Записаться", чтобы создать новую запись.',
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}?bot_id=${botId}` } }]
                ]
              }
            }
          );
        } else {
          let text = '📋 Ваши записи\n\n';
          if (upcoming.length > 0) text += `📅 Предстоящих: ${upcoming.length}\n`;
          if (past.length > 0) text += `📆 Прошедших: ${past.length}`;
          
          await bot.api.editMessageText(
            telegramId,
            callbackQuery.message?.message_id,
            text,
            {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✂️ Записаться', web_app: { url: `${serverUrl}?bot_id=${botId}` } }]
                ]
              }
            }
          );
        }
        return true; // Обработано
      }
    }
    
    // Не обработано - нужен fallback
    return false;
  }
}

export const bookingHandler = new BookingHandler();
