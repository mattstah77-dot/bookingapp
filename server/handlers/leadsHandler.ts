// Обработчик для leads-ботов
import { db } from '../database.js';
import type { BotHandler, BotContext } from './types.js';

export class LeadsHandler implements BotHandler {
  
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
}

export const leadsHandler = new LeadsHandler();
