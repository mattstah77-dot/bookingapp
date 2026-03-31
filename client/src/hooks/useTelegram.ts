import { useState } from 'react';
import type { TelegramTheme } from '../types/booking';

// Светлая тема
const lightTheme: TelegramTheme = {
  bgColor: '#ffffff',
  textColor: '#0f172a',
  buttonColor: '#2563eb',
  buttonTextColor: '#ffffff',
  hintColor: '#64748b',
  linkColor: '#3b82f6',
};

// Тёмная тема (инверсия)
const darkTheme: TelegramTheme = {
  bgColor: '#0f172a',
  textColor: '#f8fafc',
  buttonColor: '#3b82f6',
  buttonTextColor: '#ffffff',
  hintColor: '#94a3b8',
  linkColor: '#60a5fa',
};

function getStoredTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('app_theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  }
  return 'light';
}

export function useTelegramTheme(): TelegramTheme & { themeMode: 'light' | 'dark'; setThemeMode: (mode: 'light' | 'dark') => void; isDark: boolean } {
  const [themeMode, setThemeModeState] = useState<'light' | 'dark'>(getStoredTheme);

  const isDark = themeMode === 'dark';
  const currentTheme = isDark ? darkTheme : lightTheme;

  const setThemeMode = (mode: 'light' | 'dark') => {
    setThemeModeState(mode);
    localStorage.setItem('app_theme', mode);
  };

  return { ...currentTheme, themeMode, setThemeMode, isDark };
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 12) {
    return "Доброе утро. Выберите удобное время для записи";
  } else if (hour >= 12 && hour < 18) {
    return "Добрый день. Выберите услугу";
  } else if (hour >= 18 && hour < 22) {
    return "Добрый вечер. Запишитесь на удобное время";
  } else {
    return "Доброй ночи. Мы ждём вас завтра";
  }
}
