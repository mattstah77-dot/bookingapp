import { useEffect, useState } from 'react';
import type { TelegramTheme } from '../types/booking';

export function useTelegramTheme(): TelegramTheme {
  const [theme, setTheme] = useState<TelegramTheme>(() => {
    const tgTheme = window.Telegram?.WebApp?.themeParams;
    
    return {
      bgColor: tgTheme?.bg_color || '#ffffff',
      textColor: tgTheme?.text_color || '#0f172a',
      buttonColor: tgTheme?.button_color || '#2563eb',
      buttonTextColor: tgTheme?.button_text_color || '#ffffff',
      hintColor: tgTheme?.hint_color || '#64748b',
      linkColor: tgTheme?.link_color || '#3b82f6',
    };
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.onEvent('themeChanged', () => {
        const tgTheme = tg.themeParams;
        setTheme({
          bgColor: tgTheme?.bg_color || '#ffffff',
          textColor: tgTheme?.text_color || '#0f172a',
          buttonColor: tgTheme?.button_color || '#2563eb',
          buttonTextColor: tgTheme?.button_text_color || '#ffffff',
          hintColor: tgTheme?.hint_color || '#64748b',
          linkColor: tgTheme?.link_color || '#3b82f6',
        });
      });
    }
  }, []);

  return theme;
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
