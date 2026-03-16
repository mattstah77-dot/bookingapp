import { useMemo } from 'react';
import type { TelegramTheme } from '../types/booking';

export function useTelegramTheme(): TelegramTheme {
  return useMemo(() => {
    const theme = window.Telegram?.WebApp?.themeParams;
    
    return {
      bgColor: theme?.bg_color || '#ffffff',
      textColor: theme?.text_color || '#0f172a',
      buttonColor: theme?.button_color || '#2563eb',
      buttonTextColor: theme?.button_text_color || '#ffffff',
      hintColor: theme?.hint_color || '#64748b',
      linkColor: theme?.link_color || '#3b82f6',
    };
  }, []);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return "Доброе утро ☀️ Выберите удобное время для записи";
  } else if (hour >= 12 && hour < 18) {
    return "Добрый день 👋 Выберите услугу";
  } else if (hour >= 18 && hour < 22) {
    return "Добрый вечер 🌙 Запишитесь на удобное время";
  } else {
    return "Доброй ночи 🌛 Мы ждём вас завтра";
  }
}
