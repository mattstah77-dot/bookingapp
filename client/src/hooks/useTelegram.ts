import { useEffect, useState } from 'react';
import type { TelegramTheme } from '../types/booking';

// Светлая тема (текущая)
const lightTheme: TelegramTheme = {
  bgColor: '#ffffff',
  textColor: '#0f172a',
  buttonColor: '#2563eb',
  buttonTextColor: '#ffffff',
  hintColor: '#64748b',
  linkColor: '#3b82f6',
};

// Тёмная тема
const darkTheme: TelegramTheme = {
  bgColor: '#0f0f0f',
  textColor: '#f8fafc',
  buttonColor: '#3b82f6',
  buttonTextColor: '#ffffff',
  hintColor: '#94a3b8',
  linkColor: '#60a5fa',
};

type ThemeMode = 'light' | 'dark' | 'system';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

function getStoredTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('app_theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  }
  return 'system';
}

export function useTelegramTheme(): TelegramTheme & { themeMode: ThemeMode; setThemeMode: (mode: ThemeMode) => void } {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getStoredTheme);

  const resolveTheme = (): TelegramTheme => {
    if (themeMode === 'system') {
      return getSystemTheme() === 'dark' ? darkTheme : lightTheme;
    }
    return themeMode === 'dark' ? darkTheme : lightTheme;
  };

  const [currentTheme, setCurrentTheme] = useState<TelegramTheme>(resolveTheme);

  // Обновляем тему при изменении mode или системной темы
  useEffect(() => {
    const updateTheme = () => {
      setCurrentTheme(resolveTheme());
    };

    updateTheme();

    // Слушаем изменение системной темы
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('app_theme', mode);
    setCurrentTheme(mode === 'system' ? (getSystemTheme() === 'dark' ? darkTheme : lightTheme) : (mode === 'dark' ? darkTheme : lightTheme));
  };

  return { ...currentTheme, themeMode, setThemeMode };
}

// Функция для использования темы без переключателя (для обратной совместимости)
export function useTheme(): TelegramTheme {
  const theme = useTelegramTheme();
  const { themeMode, setThemeMode, ...rest } = theme;
  return rest;
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
