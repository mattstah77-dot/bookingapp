# UI Guide — Booking Template

## Overview
Универсальный шаблон для записи на услуги (барбершоп, психолог, мастер маникюра, тренер, врач и др.)

---

## Color System

### Primary Colors
```css
--primary: #2563eb        /* Синий - основной акцент */
--primary-hover: #1d4ed8  /* При наведении */
--primary-light: #eff6ff  /* Светлый фон для primary */

/* Адаптация под Telegram Theme */
--primary: theme?.button_color || #2563eb
```

### Background Colors
```css
--bg-primary: #ffffff     /* Основной фон */
--bg-secondary: #f8fafc   /* Вторичный фон (карточки) */
--bg-tertiary: #f1f5f9    /* Третичный фон */
--bg-overlay: rgba(0,0,0,0.5) /* Подложка модалок */

/* Telegram Theme fallback */
--bg-primary: theme?.bg_color || #ffffff
--bg-secondary: theme?.bg_color || #f8fafc
```

### Text Colors
```css
--text-primary: #0f172a   /* Основной текст */
--text-secondary: #64748b /* Вторичный текст */
--text-tertiary: #94a3b8  /* Третичный текст (хинты) */
--text-inverse: #ffffff   /* Текст на темном фоне */

/* Telegram Theme */
--text-primary: theme?.text_color || #0f172a
--text-secondary: theme?.hint_color || #64748b
```

### Border Colors
```css
--border: #e2e8f0         /* Стандартная граница */
--border-hover: #cbd5e1   /* При наведении */
--border-focus: #2563eb   /* При фокусе */
```

### Status Colors
```css
--success: #10b981        /* Успех */
--warning: #f59e0b        /* Предупреждение */
--error: #ef4444          /* Ошибка */
--info: #3b82f6           /* Информация */
```

---

## Typography

### Font Family
```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes (8px Grid)
```css
--text-xs: 0.75rem    /* 12px - мелкий текст, хинты */
--text-sm: 0.875rem   /* 14px - подписи */
--text-base: 1rem     /* 16px - основной текст */
--text-lg: 1.125rem   /* 18px - увеличенный текст */
--text-xl: 1.25rem    /* 20px - подзаголовки */
--text-2xl: 1.5rem    /* 24px - заголовки секций */
--text-3xl: 1.875rem  /* 30px - главный заголовок */
--text-4xl: 2.25rem   /* 36px - hero */
```

### Font Weights
```css
--font-normal: 400
--font-medium: 500
--font-semibold: 600
--font-bold: 700
```

---

## Spacing System (8px Grid)

```css
--space-1: 0.25rem   /* 4px */
--space-2: 0.5rem    /* 8px */
--space-3: 0.75rem   /* 12px */
--space-4: 1rem      /* 16px */
--space-5: 1.25rem   /* 20px */
--space-6: 1.5rem    /* 24px */
--space-8: 2rem      /* 32px */
--space-10: 2.5rem   /* 40px */
--space-12: 3rem     /* 48px */
--space-16: 4rem     /* 64px */
```

---

## Border Radius

```css
--radius-sm: 0.375rem   /* 6px */
--radius: 0.5rem        /* 8px */
--radius-md: 0.75rem    /* 12px */
--radius-lg: 1rem       /* 16px */
--radius-xl: 1.5rem     /* 24px */
--radius-full: 9999px   /* Круглые кнопки */
```

---

## Shadows

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
--shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)
```

---

## UI Components

### Button

**Primary**
- Background: `--primary`
- Text: white
- Padding: `12px 24px`
- Border-radius: `--radius-full`
- Hover: `--primary-hover`
- Transition: 200ms ease

**Secondary**
- Background: transparent
- Border: 1px solid `--border`
- Text: `--text-primary`
- Hover: `--bg-secondary`

**Disabled**
- Opacity: 0.5
- Cursor: not-allowed

**Loading**
- Show spinner
- Disabled state

---

### ServiceCard

**Structure**
```
┌─────────────────────────────────────┐
│  [Иконка категории]                 │
│                                     │
│  Название услуги                    │
│  Стрижка + мытье                    │
│                                     │
│  ⏱ 45 мин          💰 1500 ₽       │
│                                     │
│  [Выбрать]                          │
└─────────────────────────────────────┘
```

**Props**
- `name`: string
- `duration`: number (минуты)
- `price`: number
- `description?`: string
- `icon?`: ReactNode

---

### Calendar

**Structure**
```
    ◀ Март 2026 ▶
Пн  Вт  Ср  Чт  Пт  Сб  Вс
        1   2   3   4   5
6   7   8   9  10  11  12
13  14  15  16  17  18  19
20  21  22  23  24  25  26
27  28  29  30  31
```

**Features**
- Переключение месяцев (стрелки)
- Подсветка сегодняшнего дня
- Выбор даты (клик)
- Визуальное выделение выбранной даты
- Отключение прошедших дат
- Неактивные дни (прошедшие) - серые

**Props**
- `selectedDate`: Date | null
- `onDateSelect`: (date: Date) => void

---

### TimeSlots

**Structure**
```
Доступное время

┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 10:00│ │ 11:30│ │ 15:00│ │ 17:30│
└──────┘ └──────┘ └──────┘ └──────┘
┌──────┐ ┌──────┐
│ 18:00│ │ 19:30│
└──────┘ └──────┘
```

**States**
- Default: `--bg-secondary` background
- Selected: `--primary` background, white text
- Disabled: `--text-tertiary`, not-allowed cursor
- Loading: Skeleton animation

**Props**
- `slots`: string[] (время в формате "HH:MM")
- `selectedSlot`: string | null
- `onSlotSelect`: (slot: string) => void
- `loading?`: boolean

---

## Greeting Message

```javascript
const getGreeting = () => {
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
};
```

---

## Animations

### Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

### Skeleton Loading
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### Staggered Cards
```css
.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 50ms; }
.card:nth-child(3) { animation-delay: 100ms; }
/* и т.д. */
```

---

## File Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ServiceCard/
│   │   │   ├── ServiceCard.tsx
│   │   │   └── ServiceCard.module.css (или tailwind classes)
│   │   ├── Calendar/
│   │   │   └── Calendar.tsx
│   │   ├── TimeSlots/
│   │   │   └── TimeSlots.tsx
│   │   ├── Button/
│   │   │   └── Button.tsx
│   │   └── Greeting/
│   │       └── Greeting.tsx
│   ├── pages/
│   │   └── BookingPage.tsx
│   ├── hooks/
│   │   └── useBooking.ts
│   ├── styles/
│   │   └── variables.css (CSS custom properties)
│   └── types/
│       └── booking.ts
├── App.tsx
├── main.tsx
└── index.css
```

---

## Usage with Telegram Theme

```typescript
const useTelegramTheme = () => {
  const theme = window.Telegram?.WebApp?.themeParams;
  
  return {
    bgColor: theme?.bg_color || '#ffffff',
    textColor: theme?.text_color || '#0f172a',
    buttonColor: theme?.button_color || '#2563eb',
    buttonTextColor: theme?.button_text_color || '#ffffff',
    hintColor: theme?.hint_color || '#64748b',
    linkColor: theme?.link_color || '#3b82f6',
  };
};
```

---

## Design Principles

1. **Mobile-first** — оптимизация под мобильные устройства
2. **Telegram-native** — интеграция с themeParams
3. **Minimal** — минимум визуального шума
4. **Fast** — легкие анимации, быстрый отклик
5. **Accessible** — достаточный контраст, крупные tap targets (min 44px)
