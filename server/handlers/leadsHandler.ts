// Обработчик для leads-ботов
import { db } from '../database.js';
import type { BotHandler, BotContext, TelegramUpdateContext } from './types.js';

export class LeadsHandler implements BotHandler {
  // Метаданные типа бота (продуктовый слой)
  meta = {
    type: 'leads',
    name: 'Сбор заявок',
    description: 'Собирает заявки от клиентов через форму',
    category: 'marketing',
    features: [
      'Форма заявки',
      'Сохранение лидов',
      'Статусы лидов'
    ],
    isActive: true,
    isPublic: true,
    price: 5,
  };
  
  async getClientData(ctx: BotContext): Promise<any> {
    // Для leads-бота клиенту нужно только форма (данные статические)
    return {
      type: 'lead_form',
      fields: [
        { id: 'name', label: 'Ваше имя', type: 'text', required: false },
        { id: 'phone', label: 'Телефон', type: 'tel', required: true },
        { id: 'comment', label: 'Комментарий', type: 'textarea', required: false },
      ],
    };
  }

  async handleAction(ctx: BotContext, action: string, payload: any): Promise<any> {
    switch (action) {
      // === КЛИЕНТСКИЕ ACTIONS ===
      case 'create_lead': {
        const { name, phone, comment } = payload;
        
        if (!phone) {
          throw new Error('Телефон обязателен');
        }
        
        const lead = await db.createLead(ctx.botId, {
          name,
          phone,
          comment,
          telegramId: ctx.telegramId,
        });
        
        return { leadId: lead.id, message: 'Заявка отправлена!' };
      }
      
      case 'get_my_leads': {
        if (!ctx.telegramId) {
          return { leads: [] };
        }
        // Пока не реализовано - можно добавить позже
        return { leads: [] };
      }
      
      // === АДМИНСКИЕ ACTIONS ===
      case 'get_leads': {
        // Получить список лидов (с фильтром по статусу)
        const { status } = payload || {};
        const leads = await db.getLeads(ctx.botId, status);
        return { leads };
      }
      
      case 'update_lead_status': {
        const { leadId, status } = payload;
        
        if (!leadId || !status) {
          throw new Error('leadId и status обязательны');
        }
        
        if (!['new', 'contacted', 'converted', 'lost'].includes(status)) {
          throw new Error('Неверный статус');
        }
        
        await db.updateLeadStatus(ctx.botId, leadId, status);
        return { success: true };
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  async getStats(ctx: BotContext): Promise<any> {
    const stats = await db.getLeadStats(ctx.botId);
    const leads = await db.getLeads(ctx.botId);
    
    return {
      total: leads.length,
      ...stats,
    };
  }

  async getAdminData(ctx: BotContext): Promise<any> {
    const leads = await db.getLeads(ctx.botId);
    const stats = await db.getLeadStats(ctx.botId);
    
    return {
      leads,
      stats,
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
        'Привет! Я бот для сбора заявок. 👋\n\nОставьте заявку, и мы свяжемся с вами!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Оставить заявку', web_app: { url: `${serverUrl}?bot_id=${botId}` } }]
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
      
      // Для leads - просто приглашение оставить заявку
      await bot.api.sendMessage(
        telegramId,
        '📝 Нажмите кнопку ниже, чтобы оставить заявку:',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Оставить заявку', web_app: { url: `${serverUrl}?bot_id=${botId}` } }]
            ]
          }
        }
      );
      return true; // Обработано
    }
    
    // Не обработано - нужен fallback
    return false;
  }
}

export const leadsHandler = new LeadsHandler();
