import { useState, useEffect, useMemo, useCallback } from 'react';
import type { TelegramTheme } from '../types/booking';

// Светлая тема - КОНСТАНТА (не создаётся повторно)
const lightTheme: TelegramTheme = {
  bgColor: '#ffffff',
  textColor: '#0f172a',
  buttonColor: '#2563eb',
  buttonTextColor: '#ffffff',
  hintColor: '#64748b',
  linkColor: '#3b82f6',
};

// Тёмная тема - КОНСТАНТА (не создаётся повторно)
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

// Единый state на уровне модуля (синглтон)
let themeState: 'light' | 'dark' = getStoredTheme();
let listeners: Array<(mode: 'light' | 'dark') => void> = [];

function notifyListeners() {
  listeners.forEach(fn => fn(themeState));
}

function useSharedState() {
  const [mode, setMode] = useState<'light' | 'dark'>(themeState);
  
  useEffect(() => {
    listeners.push(setMode);
    return () => {
      listeners = listeners.filter(fn => fn !== setMode);
    };
  }, []);
  
  return mode;
}

export function useTelegramTheme() {
  const themeMode = useSharedState();
  const isDark = themeMode === 'dark';
  
  // Выбираем тему - это константа, ссылка не меняется
  const currentTheme = isDark ? darkTheme : lightTheme;
  
  // Стабилизируем setThemeMode через useCallback
  // Функция создаётся один раз и не меняется между рендерами
  const setThemeMode = useCallback((mode: 'light' | 'dark') => {
    themeState = mode;
    localStorage.setItem('app_theme', mode);
    notifyListeners();
  }, []);

  // Мемоизируем весь объект - создаётся только при смене темы
  const theme = useMemo(() => ({
    ...currentTheme,
    themeMode,
    setThemeMode,
    isDark,
  }), [currentTheme, themeMode, setThemeMode, isDark]);

  return theme;
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
