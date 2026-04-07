import { useState } from 'react';
import { getBotIdFromUrl, getTelegramId } from '../utils';
import { Button } from '../components/Button/Button';
import { Alert } from '../components/Alert/Alert';
import { Send, User, Phone, MessageSquare } from 'lucide-react';

const API_BASE = '/api';

export default function LeadFormPage() {
  const botId = getBotIdFromUrl();
  const telegramId = getTelegramId();
  
  const [form, setForm] = useState({
    name: '',
    phone: '',
    comment: '',
  });
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{type: 'success' | 'error'; message: string} | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      const res = await fetch(`${API_BASE}/bots/${botId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-bot-id': String(botId),
          ...(telegramId ? { 'x-telegram-id': String(telegramId) } : {}),
        },
        body: JSON.stringify({
          action: 'create_lead',
          payload: form,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setAlert({ type: 'success', message: data.data?.message || 'Заявка отправлена!' });
        setForm({ name: '', phone: '', comment: '' });
      } else {
        setAlert({ type: 'error', message: data.error || 'Ошибка' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Ошибка соединения' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">
          Оставьте заявку
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Заполните форму и мы свяжемся с вами
        </p>

        {alert && (
          <Alert
            type={alert.type}
            isOpen={!!alert}
            title={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ваше имя
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Иван"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Телефон *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="+7 (999) 123-45-67"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Комментарий
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="Ваш комментарий..."
                rows={3}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading || !form.phone}
            className="w-full"
          >
            {loading ? (
              'Отправка...'
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Отправить заявку
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
