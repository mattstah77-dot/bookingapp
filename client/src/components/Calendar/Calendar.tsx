import { useState, useMemo } from 'react';
import { useTelegramTheme } from '../../hooks/useTelegram';
import { Button } from '../Button/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
}

export function Calendar({ selectedDate, onDateSelect }: CalendarProps) {
  const theme = useTelegramTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const isDark = (() => {
    const bg = theme.bgColor;
    if (!bg || bg === '#ffffff') return false;
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return false;
    return parseInt(hex, 16) < 128000;
  })();

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Добавляем пустые дни в начале недели (понедельник = 0)
    const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Добавляем дни месяца
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const isPast = (date: Date): boolean => {
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    return dateOnly < today;
  };

  const goToPrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div 
      className="calendar-container"
      style={{ 
        backgroundColor: isDark ? `${theme.bgColor}f0` : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderColor: `${theme.hintColor}20`,
        boxShadow: isDark ? '0 8px 30px rgba(0,0,0,0.3)' : '0 8px 30px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={goToPrevMonth}
          style={{ padding: '10px' }}
        >
          <ChevronLeft size={22} style={{ color: theme.textColor }} />
        </Button>

        <h3 
          className="text-lg font-semibold"
          style={{ color: theme.textColor }}
        >
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>

        <Button
          variant="ghost"
          size="sm"
          onClick={goToNextMonth}
          style={{ padding: '10px' }}
        >
          <ChevronRight size={22} style={{ color: theme.textColor }} />
        </Button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div 
            key={day} 
            className="text-center text-xs font-semibold py-2"
            style={{ color: theme.hintColor }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          const past = isPast(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => !past && onDateSelect(date)}
              disabled={past}
              className="calendar-day"
              style={{
                backgroundColor: isSelected 
                  ? theme.buttonColor 
                  : isToday 
                    ? `${theme.buttonColor}15`
                    : 'transparent',
                color: isSelected 
                  ? theme.buttonTextColor 
                  : past 
                    ? theme.hintColor 
                    : theme.textColor,
              }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <style>{`
        .calendar-container {
          border-radius: 24px;
          border: 1px solid;
          padding: 24px;
          transition: all 0.25s ease;
        }
        .calendar-day {
          aspect-ratio: 1;
          border-radius: 14px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .calendar-day:hover:not(:disabled) {
          transform: scale(1.1);
          background-color: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'} !important;
        }
        .calendar-day:active:not(:disabled) {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}
